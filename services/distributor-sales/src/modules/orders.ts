import { Elysia, t } from "elysia";
import db from "../db/connection";
import { newId } from "../lib/id";
import { ok, err, paginated } from "../lib/response";

const Item = t.Object({
  product_id: t.String(),
  qty: t.Number({ minimum: 1 }),
  discount: t.Number({ default: 0 }),
});

const soNo = () => {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `SO-${ymd}-${Math.floor(1000 + Math.random() * 9000)}`;
};

export const orders = new Elysia({ prefix: "/orders" })
  .get("/", ({ query }) => {
    const page = Number(query.page ?? 1);
    const limit = Math.min(Number(query.limit ?? 20), 100);
    const offset = (page - 1) * limit;
    const conds: string[] = [];
    const params: Record<string, unknown> = {};
    if (query.status) {
      conds.push("o.status = $status");
      params.$status = query.status;
    }
    if (query.search) {
      conds.push("(o.so_no LIKE $q OR c.name LIKE $q)");
      params.$q = `%${query.search}%`;
    }
    const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
    const rows = db
      .query(
        `SELECT o.*, c.name AS customer_name, c.city AS customer_city,
                r.name AS sales_name, d.name AS distributor_name,
                (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) AS total_items
         FROM orders o
         JOIN customers c ON c.id = o.customer_id
         JOIN sales_reps r ON r.id = o.sales_rep_id
         LEFT JOIN distributors d ON d.id = o.distributor_id
         ${where} ORDER BY o.date DESC, o.created_at DESC LIMIT $limit OFFSET $offset`
      )
      .all({ ...params, $limit: limit, $offset: offset });
    const total = (db.query(`SELECT COUNT(*) AS c FROM orders o JOIN customers c ON c.id = o.customer_id ${where}`).get(params) as { c: number }).c;
    return paginated(rows, total, page, limit);
  }, {
    query: t.Object({
      status: t.Optional(t.String()),
      search: t.Optional(t.String()),
      page: t.Optional(t.String()),
      limit: t.Optional(t.String()),
    }),
  })
  .get("/:id", ({ params }) => {
    const head = db
      .query(
        `SELECT o.*, c.name AS customer_name, r.name AS sales_name, d.name AS distributor_name
         FROM orders o
         JOIN customers c ON c.id = o.customer_id
         JOIN sales_reps r ON r.id = o.sales_rep_id
         LEFT JOIN distributors d ON d.id = o.distributor_id
         WHERE o.id = $id`
      )
      .get({ $id: params.id }) as unknown;
    if (!head) err("Order not found", 404);
    const items = db
      .query(
        `SELECT i.*, p.sku, p.name AS product_name, p.unit
         FROM order_items i JOIN products p ON p.id = i.product_id
         WHERE i.order_id = $id`
      )
      .all({ $id: params.id });
    const invoice = db.query("SELECT inv_no, status, grand_total, paid_total FROM invoices WHERE order_id = $id").get({ $id: params.id });
    return ok({ ...(head as object), items, invoice });
  })
  .post(
    "/",
    ({ body }) => {
      const cus = db.query("SELECT id FROM customers WHERE id = $id").get({ $id: body.customer_id });
      if (!cus) err("Customer not found", 404);
      const rep = db.query("SELECT id FROM sales_reps WHERE id = $id").get({ $id: body.sales_rep_id });
      if (!rep) err("Sales rep not found", 404);
      if (body.distributor_id && !db.query("SELECT id FROM distributors WHERE id = $id").get({ $id: body.distributor_id }))
        err("Distributor not found", 404);
      const id = newId("SO");
      const no = soNo();
      let subtotal = 0;
      let discTotal = 0;
      const lines: { pid: string; qty: number; price: number; disc: number; total: number }[] = [];
      for (const it of body.items) {
        const p = db.query("SELECT id, price FROM products WHERE id = $id").get({ $id: it.product_id }) as
          { id: string; price: number } | null;
        if (!p) err(`Product not found: ${it.product_id}`, 404);
        const gross = p!.price * it.qty;
        const disc = Math.round(gross * (Math.min(Math.max(it.discount ?? 0, 0), 100) / 100));
        lines.push({ pid: it.product_id, qty: it.qty, price: p!.price, disc: it.discount ?? 0, total: gross - disc });
        subtotal += gross;
        discTotal += disc;
      }
      const tx = db.transaction(() => {
        db.query(
          `INSERT INTO orders (id, so_no, customer_id, sales_rep_id, distributor_id, date, status, subtotal, discount_total, grand_total, note)
           VALUES ($id,$no,$c,$r,$d,$date,'draft',$sub,$disc,$grand,$note)`
        ).run({
          $id: id, $no: no, $c: body.customer_id, $r: body.sales_rep_id,
          $d: body.distributor_id ?? null,
          $date: body.date ?? new Date().toISOString().slice(0, 10),
          $sub: subtotal, $disc: discTotal, $grand: subtotal - discTotal,
          $note: body.note ?? null,
        });
        for (const l of lines) {
          db.query(
            `INSERT INTO order_items (id, order_id, product_id, qty, price, discount, line_total)
             VALUES ($id,$o,$p,$q,$pr,$disc,$total)`
          ).run({
            $id: newId("SOI"), $o: id, $p: l.pid, $q: l.qty, $pr: l.price, $disc: l.disc, $total: l.total,
          });
        }
      });
      tx();
      return ok({ id, so_no: no, grand_total: subtotal - discTotal }, "Order created");
    },
    {
      body: t.Object({
        customer_id: t.String(),
        sales_rep_id: t.String(),
        distributor_id: t.Optional(t.String()),
        date: t.Optional(t.String()),
        note: t.Optional(t.String()),
        items: t.Array(Item, { minItems: 1 }),
      }),
    }
  )
  // Ubah status: draft → confirmed → shipped → (invoiced via /invoices)
  .patch(
    "/:id/status",
    ({ params, body }) => {
      const o = db.query("SELECT id, status FROM orders WHERE id = $id").get({ $id: params.id }) as
        { id: string; status: string } | null;
      if (!o) err("Order not found", 404);
      const flow: Record<string, string[]> = {
        draft: ["confirmed", "cancelled"],
        confirmed: ["shipped", "cancelled"],
        shipped: ["cancelled"],
        invoiced: [],
        cancelled: [],
      };
      if (!flow[o!.status]?.includes(body.status)) err(`Cannot move ${o!.status} → ${body.status}`, 400);
      db.query("UPDATE orders SET status = $s WHERE id = $id").run({ $s: body.status, $id: params.id });
      return ok({ id: params.id, status: body.status }, "Order status updated");
    },
    { body: t.Object({ status: t.String() }) }
  );
