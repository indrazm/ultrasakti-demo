import { Elysia, t } from "elysia";
import db from "../db/connection";
import { newId } from "../lib/id";
import { ok, err } from "../lib/response";
import { refreshInvoiceStatus } from "./invoices";

const payNo = () => {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `PAY-${ymd}-${Math.floor(1000 + Math.random() * 9000)}`;
};

export const payments = new Elysia({ prefix: "/payments" })
  .get("/", ({ query }) => {
    const rows = db
      .query(
        `SELECT p.*, i.inv_no, c.name AS customer_name
         FROM payments p
         JOIN invoices i ON i.id = p.invoice_id
         JOIN customers c ON c.id = i.customer_id
         ORDER BY p.date DESC, p.created_at DESC LIMIT 100`
      )
      .all();
    void query;
    return ok(rows);
  })
  .post(
    "/",
    ({ body }) => {
      const inv = db.query("SELECT id, grand_total, paid_total FROM invoices WHERE id = $id").get({ $id: body.invoice_id }) as
        { id: string; grand_total: number; paid_total: number } | null;
      if (!inv) err("Invoice not found", 404);
      const outstanding = inv!.grand_total - inv!.paid_total;
      if (body.amount <= 0) err("Amount must be positive", 400);
      if (body.amount - outstanding > 0.01) err(`Overpayment: outstanding only ${outstanding.toLocaleString("id-ID")}`, 400);
      const id = newId("PAY");
      const no = payNo();
      const tx = db.transaction(() => {
        db.query(
          `INSERT INTO payments (id, pay_no, invoice_id, date, amount, method, note)
           VALUES ($id,$no,$inv,$date,$amount,$method,$note)`
        ).run({
          $id: id, $no: no, $inv: body.invoice_id,
          $date: body.date ?? new Date().toISOString().slice(0, 10),
          $amount: body.amount, $method: body.method, $note: body.note ?? null,
        });
        db.query("UPDATE invoices SET paid_total = paid_total + $a WHERE id = $id").run({
          $a: body.amount, $id: body.invoice_id,
        });
      });
      tx();
      refreshInvoiceStatus(body.invoice_id);
      const updated = db.query("SELECT status, paid_total, grand_total FROM invoices WHERE id = $id").get({ $id: body.invoice_id });
      return ok({ id, pay_no: no, invoice: updated }, "Payment recorded");
    },
    {
      body: t.Object({
        invoice_id: t.String(),
        amount: t.Number(),
        method: t.String({ default: "transfer" }),
        date: t.Optional(t.String()),
        note: t.Optional(t.String()),
      }),
    }
  );
