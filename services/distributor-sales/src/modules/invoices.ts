import { Elysia, t } from "elysia";
import db from "../db/connection";
import { newId } from "../lib/id";
import { ok, err, paginated } from "../lib/response";

const invNo = (date: string) => `INV-${date.replaceAll("-", "").slice(0, 6)}-${Math.floor(1000 + Math.random() * 9000)}`;

export function refreshInvoiceStatus(invoiceId: string) {
  const inv = db.query("SELECT grand_total, paid_total, due_date FROM invoices WHERE id = $id").get({ $id: invoiceId }) as
    { grand_total: number; paid_total: number; due_date: string } | null;
  if (!inv) return;
  let status = "unpaid";
  if (inv.paid_total >= inv.grand_total) status = "paid";
  else if (inv.paid_total > 0) status = inv.due_date < new Date().toISOString().slice(0, 10) ? "overdue" : "partial";
  else if (inv.due_date < new Date().toISOString().slice(0, 10)) status = "overdue";
  db.query("UPDATE invoices SET status = $s WHERE id = $id").run({ $s: status, $id: invoiceId });
}

export const invoices = new Elysia({ prefix: "/invoices" })
  .get("/", ({ query }) => {
    const page = Number(query.page ?? 1);
    const limit = Math.min(Number(query.limit ?? 20), 100);
    const offset = (page - 1) * limit;
    const conds: string[] = [];
    const params: Record<string, unknown> = {};
    if (query.status) {
      if (query.status === "overdue") {
        conds.push("i.status = 'overdue'");
      } else {
        conds.push("i.status = $status");
        params.$status = query.status;
      }
    }
    if (query.search) {
      conds.push("(i.inv_no LIKE $q OR c.name LIKE $q)");
      params.$q = `%${query.search}%`;
    }
    const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
    const rows = db
      .query(
        `SELECT i.*, c.name AS customer_name, o.so_no,
                (i.grand_total - i.paid_total) AS outstanding,
                CAST(julianday('now') - julianday(i.due_date) AS INTEGER) AS days_overdue
         FROM invoices i
         JOIN customers c ON c.id = i.customer_id
         JOIN orders o ON o.id = i.order_id
         ${where} ORDER BY i.due_date ASC LIMIT $limit OFFSET $offset`
      )
      .all({ ...params, $limit: limit, $offset: offset });
    const total = (
      db.query(`SELECT COUNT(*) AS c FROM invoices i JOIN customers c ON c.id = i.customer_id ${where}`).get(params) as { c: number }
    ).c;
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
        `SELECT i.*, c.name AS customer_name, c.top_days, o.so_no,
                (i.grand_total - i.paid_total) AS outstanding
         FROM invoices i
         JOIN customers c ON c.id = i.customer_id
         JOIN orders o ON o.id = i.order_id
         WHERE i.id = $id`
      )
      .get({ $id: params.id }) as unknown;
    if (!head) err("Invoice not found", 404);
    const items = db
      .query(
        `SELECT i.*, p.sku, p.name AS product_name, p.unit
         FROM invoice_items i JOIN products p ON p.id = i.product_id
         WHERE i.invoice_id = $id`
      )
      .all({ $id: params.id });
    const payments = db.query("SELECT * FROM payments WHERE invoice_id = $id ORDER BY date").all({ $id: params.id });
    return ok({ ...(head as object), items, payments });
  })
  // Buat invoice dari order yang sudah shipped (PPN 11%, jatuh tempo = TOP customer)
  .post(
    "/",
    ({ body }) => {
      const o = db
        .query("SELECT id, customer_id, status, grand_total FROM orders WHERE id = $id")
        .get({ $id: body.order_id }) as
        { id: string; customer_id: string; status: string; grand_total: number } | null;
      if (!o) err("Order not found", 404);
      if (o!.status !== "shipped") err(`Order must be shipped (current: ${o!.status})`, 400);
      const cus = db.query("SELECT top_days FROM customers WHERE id = $id").get({ $id: o!.customer_id }) as
        { top_days: number };
      const date = body.date ?? new Date().toISOString().slice(0, 10);
      const due = new Date(date);
      due.setDate(due.getDate() + cus.top_days);
      const dueStr = due.toISOString().slice(0, 10);
      const ppn = Math.round(o!.grand_total * 0.11);
      const id = newId("INV");
      const no = invNo(date);
      const tx = db.transaction(() => {
        db.query(
          `INSERT INTO invoices (id, inv_no, order_id, customer_id, date, due_date, subtotal, ppn, grand_total, paid_total, status)
           VALUES ($id,$no,$o,$c,$date,$due,$sub,$ppn,$grand,0,'unpaid')`
        ).run({
          $id: id, $no: no, $o: o!.id, $c: o!.customer_id, $date: date, $due: dueStr,
          $sub: o!.grand_total, $ppn: ppn, $grand: o!.grand_total + ppn,
        });
        const items = db.query("SELECT * FROM order_items WHERE order_id = $o").all({ $o: o!.id }) as
          { product_id: string; qty: number; price: number; discount: number; line_total: number }[];
        for (const it of items) {
          db.query(
            `INSERT INTO invoice_items (id, invoice_id, product_id, qty, price, discount, line_total)
             VALUES ($id,$inv,$p,$q,$pr,$disc,$total)`
          ).run({
            $id: newId("INVI"), $inv: id, $p: it.product_id, $q: it.qty,
            $pr: it.price, $disc: it.discount, $total: it.line_total,
          });
        }
        db.query("UPDATE orders SET status = 'invoiced' WHERE id = $id").run({ $id: o!.id });
      });
      try {
        tx();
      } catch {
        err("Invoice already exists for this order", 409);
      }
      refreshInvoiceStatus(id);
      return ok({ id, inv_no: no, due_date: dueStr, grand_total: o!.grand_total + ppn }, "Invoice created");
    },
    { body: t.Object({ order_id: t.String(), date: t.Optional(t.String()) }) }
  );
