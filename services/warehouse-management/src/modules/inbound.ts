import { Elysia, t } from "elysia";
import db from "../db/connection";
import { newId, trxNo } from "../lib/id";
import { ok, err, paginated } from "../lib/response";

const Item = t.Object({
  product_id: t.String(),
  batch_no: t.String({ default: "-" }),
  expired_date: t.Optional(t.String()),
  qty: t.Number({ minimum: 1 }),
  price: t.Optional(t.Number()),
});

export const inbound = new Elysia({ prefix: "/inbound" })
  .get("/", ({ query }) => {
    const page = Number(query.page ?? 1);
    const limit = Math.min(Number(query.limit ?? 20), 100);
    const offset = (page - 1) * limit;
    const rows = db
      .query(
        `SELECT h.*, w.name AS warehouse_name, s.name AS supplier_name,
                (SELECT COUNT(*) FROM inbound_items WHERE inbound_id = h.id) AS total_items,
                (SELECT COALESCE(SUM(qty),0) FROM inbound_items WHERE inbound_id = h.id) AS total_qty
         FROM inbound_headers h
         LEFT JOIN warehouses w ON w.id = h.warehouse_id
         LEFT JOIN suppliers s ON s.id = h.supplier_id
         ORDER BY h.created_at DESC LIMIT $limit OFFSET $offset`
      )
      .all({ $limit: limit, $offset: offset });
    const total = (db.query("SELECT COUNT(*) AS c FROM inbound_headers").get() as { c: number }).c;
    return paginated(rows, total, page, limit);
  }, {
    query: t.Object({ page: t.Optional(t.String()), limit: t.Optional(t.String()) }),
  })
  .get("/:id", ({ params }) => {
    const head = db.query("SELECT * FROM inbound_headers WHERE id = $id").get({ $id: params.id }) as unknown;
    if (!head) err("Inbound not found", 404);
    const items = db
      .query(
        `SELECT i.*, p.sku, p.name AS product_name
         FROM inbound_items i JOIN products p ON p.id = i.product_id
         WHERE i.inbound_id = $id`
      )
      .all({ $id: params.id });
    return ok({ ...(head as object), items });
  })
  .post(
    "/",
    ({ body }) => {
      const wh = db.query("SELECT id FROM warehouses WHERE id = $id").get({ $id: body.warehouse_id });
      if (!wh) err("Warehouse not found", 404);
      if (body.supplier_id) {
        const sup = db.query("SELECT id FROM suppliers WHERE id = $id").get({ $id: body.supplier_id });
        if (!sup) err("Supplier not found", 404);
      }
      const id = newId("IN");
      const no = trxNo("IN");

      const tx = db.transaction(() => {
        db.query(
          `INSERT INTO inbound_headers (id, trx_no, warehouse_id, supplier_id, date, note)
           VALUES ($id, $trx_no, $warehouse_id, $supplier_id, $date, $note)`
        ).run({
          $id: id,
          $trx_no: no,
          $warehouse_id: body.warehouse_id,
          $supplier_id: body.supplier_id ?? null,
          $date: body.date ?? new Date().toISOString().slice(0, 10),
          $note: body.note ?? null,
        });
        for (const it of body.items) {
          const prod = db.query("SELECT id FROM products WHERE id = $id").get({ $id: it.product_id });
          if (!prod) throw Object.assign(new Error(`Product not found: ${it.product_id}`), { status: 404 });
          db.query(
            `INSERT INTO inbound_items (id, inbound_id, product_id, batch_no, expired_date, qty, price)
             VALUES ($id, $inbound_id, $product_id, $batch_no, $expired_date, $qty, $price)`
          ).run({
            $id: newId("INI"),
            $inbound_id: id,
            $product_id: it.product_id,
            $batch_no: it.batch_no ?? "-",
            $expired_date: it.expired_date ?? null,
            $qty: it.qty,
            $price: it.price ?? 0,
          });
          // upsert stock (tambah)
          const existing = db
            .query("SELECT id, qty FROM stocks WHERE product_id = $p AND warehouse_id = $w AND batch_no = $b")
            .get({ $p: it.product_id, $w: body.warehouse_id, $b: it.batch_no ?? "-" }) as
            { id: string; qty: number } | null;
          if (existing) {
            db.query("UPDATE stocks SET qty = qty + $qty, expired_date = COALESCE($exp, expired_date), updated_at = datetime('now') WHERE id = $id").run({
              $qty: it.qty, $exp: it.expired_date ?? null, $id: existing.id,
            });
          } else {
            db.query(
              `INSERT INTO stocks (id, product_id, warehouse_id, batch_no, expired_date, qty)
               VALUES ($id, $p, $w, $b, $exp, $qty)`
            ).run({
              $id: newId("STK"), $p: it.product_id, $w: body.warehouse_id,
              $b: it.batch_no ?? "-", $exp: it.expired_date ?? null, $qty: it.qty,
            });
          }
        }
      });
      try {
        tx();
      } catch (e: any) {
        err(e.message ?? "Failed to create inbound", e.status ?? 400);
      }
      return ok({ id, trx_no: no }, "Inbound created, stock added");
    },
    {
      body: t.Object({
        warehouse_id: t.String(),
        supplier_id: t.Optional(t.String()),
        date: t.Optional(t.String()),
        note: t.Optional(t.String()),
        items: t.Array(Item, { minItems: 1 }),
      }),
    }
  );
