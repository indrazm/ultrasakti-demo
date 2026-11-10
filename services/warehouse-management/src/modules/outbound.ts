import { Elysia, t } from "elysia";
import db from "../db/connection";
import { newId, trxNo } from "../lib/id";
import { ok, err, paginated } from "../lib/response";

const Item = t.Object({
  product_id: t.String(),
  batch_no: t.String({ default: "-" }),
  qty: t.Number({ minimum: 1 }),
});

export const outbound = new Elysia({ prefix: "/outbound" })
  .get("/", ({ query }) => {
    const page = Number(query.page ?? 1);
    const limit = Math.min(Number(query.limit ?? 20), 100);
    const offset = (page - 1) * limit;
    const rows = db
      .query(
        `SELECT h.*, w.name AS warehouse_name,
                (SELECT COUNT(*) FROM outbound_items WHERE outbound_id = h.id) AS total_items,
                (SELECT COALESCE(SUM(qty),0) FROM outbound_items WHERE outbound_id = h.id) AS total_qty
         FROM outbound_headers h
         LEFT JOIN warehouses w ON w.id = h.warehouse_id
         ORDER BY h.created_at DESC LIMIT $limit OFFSET $offset`
      )
      .all({ $limit: limit, $offset: offset });
    const total = (db.query("SELECT COUNT(*) AS c FROM outbound_headers").get() as { c: number }).c;
    return paginated(rows, total, page, limit);
  }, {
    query: t.Object({ page: t.Optional(t.String()), limit: t.Optional(t.String()) }),
  })
  .get("/:id", ({ params }) => {
    const head = db.query("SELECT * FROM outbound_headers WHERE id = $id").get({ $id: params.id }) as unknown;
    if (!head) err("Outbound not found", 404);
    const items = db
      .query(
        `SELECT i.*, p.sku, p.name AS product_name
         FROM outbound_items i JOIN products p ON p.id = i.product_id
         WHERE i.outbound_id = $id`
      )
      .all({ $id: params.id });
    return ok({ ...(head as object), items });
  })
  .post(
    "/",
    ({ body }) => {
      const wh = db.query("SELECT id FROM warehouses WHERE id = $id").get({ $id: body.warehouse_id });
      if (!wh) err("Warehouse not found", 404);
      const id = newId("OUT");
      const no = trxNo("OUT");

      const tx = db.transaction(() => {
        db.query(
          `INSERT INTO outbound_headers (id, trx_no, warehouse_id, destination, date, note)
           VALUES ($id, $trx_no, $warehouse_id, $destination, $date, $note)`
        ).run({
          $id: id,
          $trx_no: no,
          $warehouse_id: body.warehouse_id,
          $destination: body.destination,
          $date: body.date ?? new Date().toISOString().slice(0, 10),
          $note: body.note ?? null,
        });
        for (const it of body.items) {
          const stock = db
            .query("SELECT id, qty FROM stocks WHERE product_id = $p AND warehouse_id = $w AND batch_no = $b")
            .get({ $p: it.product_id, $w: body.warehouse_id, $b: it.batch_no ?? "-" }) as
            { id: string; qty: number } | null;
          if (!stock) throw Object.assign(new Error(`No stock for product ${it.product_id} batch ${it.batch_no}`), { status: 400 });
          if (stock.qty < it.qty)
            throw Object.assign(
              new Error(`Insufficient stock: available ${stock.qty}, requested ${it.qty}`),
              { status: 400 }
            );
          db.query(
            `INSERT INTO outbound_items (id, outbound_id, product_id, batch_no, qty)
             VALUES ($id, $outbound_id, $product_id, $batch_no, $qty)`
          ).run({
            $id: newId("OUTI"), $outbound_id: id, $product_id: it.product_id,
            $batch_no: it.batch_no ?? "-", $qty: it.qty,
          });
          db.query("UPDATE stocks SET qty = qty - $qty, updated_at = datetime('now') WHERE id = $id").run({
            $qty: it.qty, $id: stock.id,
          });
        }
      });
      try {
        tx();
      } catch (e: any) {
        err(e.message ?? "Failed to create outbound", e.status ?? 400);
      }
      return ok({ id, trx_no: no }, "Outbound created, stock deducted");
    },
    {
      body: t.Object({
        warehouse_id: t.String(),
        destination: t.String({ minLength: 2 }),
        date: t.Optional(t.String()),
        note: t.Optional(t.String()),
        items: t.Array(Item, { minItems: 1 }),
      }),
    }
  );
