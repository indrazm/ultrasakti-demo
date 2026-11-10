import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import db from "../db/connection";
import { newId } from "../lib/id";
import { refreshInvoiceStatus } from "../modules/invoices";

const text = (data: unknown) => ({
  content: [{ type: "text" as const, text: typeof data === "string" ? data : JSON.stringify(data, null, 2) }],
});
const toolError = (message: string) => ({
  content: [{ type: "text" as const, text: `Error: ${message}` }],
  isError: true as const,
});
const LIMIT = (n: number) => Math.min(Math.max(n, 1), 200);

// Cursor pagination opaque (base64url dari offset). Ordering harus stabil (ORDER BY ...).
const encodeCursor = (offset: number) =>
  Buffer.from(JSON.stringify({ offset })).toString("base64url");
const decodeCursor = (cursor?: string): number => {
  if (!cursor) return 0;
  const o = (JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as { offset: unknown }).offset;
  if (!Number.isInteger(o) || (o as number) < 0) throw new Error("Invalid cursor");
  return o as number;
};

export function createSalesMcpServer(): McpServer {
  const server = new McpServer({ name: "ultra-sakti-sales", version: "1.0.0" });

  server.registerTool(
    "sales_summary",
    {
      description: "Ringkasan sales: revenue, outstanding AR, overdue, achievement vs target, leaderboard.",
      inputSchema: {},
    },
    async () => {
      const one = (sql: string, p: Record<string, unknown> = {}) =>
        (db.query(sql).get(p) as unknown as Record<string, number>);
      const month = new Date().toISOString().slice(0, 7);
      const kpi = {
        revenue: one("SELECT COALESCE(SUM(grand_total),0) AS s FROM orders WHERE status NOT IN ('draft','cancelled')").s,
        invoiced: one("SELECT COALESCE(SUM(grand_total),0) AS s FROM invoices").s,
        collected: one("SELECT COALESCE(SUM(paid_total),0) AS s FROM invoices").s,
        overdue: one("SELECT COALESCE(SUM(grand_total - paid_total),0) AS s FROM invoices WHERE status = 'overdue'").s,
        monthRevenue: one(
          "SELECT COALESCE(SUM(grand_total),0) AS s FROM orders WHERE substr(date,1,7) = $m AND status NOT IN ('draft','cancelled')",
          { $m: month }
        ).s,
        monthTarget: one("SELECT COALESCE(SUM(monthly_target),0) AS s FROM sales_reps").s,
      };
      return text({
        ...kpi,
        outstanding: kpi.invoiced - kpi.collected,
        achievement: kpi.monthTarget > 0 ? Math.round((kpi.monthRevenue / kpi.monthTarget) * 100) : 0,
      });
    }
  );

  server.registerTool(
    "sales_leaderboard",
    { description: "Peringkat sales rep: order, revenue, target, achievement bulan berjalan.", inputSchema: {} },
    async () => {
      const month = new Date().toISOString().slice(0, 7);
      const rows = db
        .query(
          `SELECT r.code, r.name, r.area, r.monthly_target, COUNT(o.id) AS orders,
                  COALESCE(SUM(CASE WHEN o.status NOT IN ('draft','cancelled') THEN o.grand_total ELSE 0 END),0) AS revenue,
                  COALESCE(SUM(CASE WHEN substr(o.date,1,7) = $m AND o.status NOT IN ('draft','cancelled') THEN o.grand_total ELSE 0 END),0) AS month_revenue
           FROM sales_reps r LEFT JOIN orders o ON o.sales_rep_id = r.id
           GROUP BY r.id ORDER BY revenue DESC`
        )
        .all({ $m: month }) as Record<string, any>[];
      return text(rows.map((r) => ({
        ...r,
        achievement: r.monthly_target > 0 ? Math.round((r.month_revenue / r.monthly_target) * 100) : 0,
      })));
    }
  );

  server.registerTool(
    "list_orders",
    {
      description: "Daftar sales order (filter status / cari).",
      inputSchema: {
        status: z.string().optional(),
        search: z.string().optional(),
        limit: z.number().default(20),
      },
    },
    async ({ status, search, limit }) => {
      const conds: string[] = [];
      const params: Record<string, unknown> = {};
      if (status) {
        conds.push("o.status = $s");
        params.$s = status;
      }
      if (search) {
        conds.push("(o.so_no LIKE $q OR c.name LIKE $q)");
        params.$q = `%${search}%`;
      }
      const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
      const rows = db
        .query(
          `SELECT o.so_no, o.date, o.status, o.grand_total, c.name AS customer, r.name AS sales
           FROM orders o JOIN customers c ON c.id = o.customer_id
           JOIN sales_reps r ON r.id = o.sales_rep_id
           ${where} ORDER BY o.date DESC LIMIT $limit`
        )
        .all({ ...params, $limit: LIMIT(limit) });
      return text(rows);
    }
  );

  server.registerTool(
    "get_order",
    {
      description: "Detail order + items + invoice terkait.",
      inputSchema: { so_no_or_id: z.string() },
    },
    async ({ so_no_or_id }) => {
      let head = db.query("SELECT * FROM orders WHERE id = $v").get({ $v: so_no_or_id }) as unknown;
      if (!head) head = db.query("SELECT * FROM orders WHERE so_no = $v").get({ $v: so_no_or_id }) as unknown;
      if (!head) return toolError("Order not found");
      const oid = (head as { id: string }).id;
      const items = db
        .query(
          `SELECT i.qty, i.price, i.discount, i.line_total, p.sku, p.name AS product
           FROM order_items i JOIN products p ON p.id = i.product_id WHERE i.order_id = $o`
        )
        .all({ $o: oid });
      const invoice = db.query("SELECT inv_no, status, grand_total, paid_total FROM invoices WHERE order_id = $o").get({ $o: oid });
      return text({ ...(head as object), items, invoice });
    }
  );

  server.registerTool(
    "create_order",
    {
      description: "Buat sales order baru (status draft, total dihitung otomatis).",
      inputSchema: {
        customer_id: z.string(),
        sales_rep_id: z.string(),
        distributor_id: z.string().optional(),
        note: z.string().optional(),
        items: z.array(z.object({
          product_id: z.string(),
          qty: z.number().min(1),
          discount: z.number().default(0),
        })).min(1),
      },
    },
    async ({ customer_id, sales_rep_id, distributor_id, note, items }) => {
      if (!db.query("SELECT id FROM customers WHERE id = $id").get({ $id: customer_id })) return toolError("Customer not found");
      if (!db.query("SELECT id FROM sales_reps WHERE id = $id").get({ $id: sales_rep_id })) return toolError("Sales rep not found");
      let sub = 0, disc = 0;
      const lines: { pid: string; q: number; pr: number; d: number; t: number }[] = [];
      for (const it of items) {
        const p = db.query("SELECT price FROM products WHERE id = $id").get({ $id: it.product_id }) as { price: number } | null;
        if (!p) return toolError(`Product not found: ${it.product_id}`);
        const gross = p.price * it.qty;
        const dd = Math.round(gross * (Math.min(Math.max(it.discount ?? 0, 0), 100) / 100));
        lines.push({ pid: it.product_id, q: it.qty, pr: p.price, d: it.discount ?? 0, t: gross - dd });
        sub += gross;
        disc += dd;
      }
      const id = newId("SO");
      const d = new Date();
      const no = `SO-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}-${Math.floor(1000 + Math.random() * 9000)}`;
      db.transaction(() => {
        db.query("INSERT INTO orders (id, so_no, customer_id, sales_rep_id, distributor_id, status, subtotal, discount_total, grand_total, note) VALUES ($id,$no,$c,$r,$d,'draft',$sub,$disc,$grand,$n)")
          .run({
            $id: id, $no: no, $c: customer_id, $r: sales_rep_id, $d: distributor_id ?? null,
            $sub: sub, $disc: disc, $grand: sub - disc, $n: note ?? null,
          });
        for (const l of lines) {
          db.query("INSERT INTO order_items (id, order_id, product_id, qty, price, discount, line_total) VALUES ($id,$o,$p,$q,$pr,$d,$t)")
            .run({ $id: newId("SOI"), $o: id, $p: l.pid, $q: l.q, $pr: l.pr, $d: l.d, $t: l.t });
        }
      })();
      return text({ so_no: no, grand_total: sub - disc });
    }
  );

  server.registerTool(
    "set_order_status",
    {
      description: "Ubah status order (draft→confirmed→shipped; bisa cancelled).",
      inputSchema: { so_no_or_id: z.string(), status: z.string() },
    },
    async ({ so_no_or_id, status }) => {
      let o = db.query("SELECT id, status FROM orders WHERE id = $v").get({ $v: so_no_or_id }) as { id: string; status: string } | null;
      if (!o) o = db.query("SELECT id, status FROM orders WHERE so_no = $v").get({ $v: so_no_or_id }) as typeof o;
      if (!o) return toolError("Order not found");
      const flow: Record<string, string[]> = {
        draft: ["confirmed", "cancelled"], confirmed: ["shipped", "cancelled"],
        shipped: ["cancelled"], invoiced: [], cancelled: [],
      };
      if (!flow[o.status]?.includes(status)) return toolError(`Cannot move ${o.status} → ${status}`);
      db.query("UPDATE orders SET status = $s WHERE id = $id").run({ $s: status, $id: o.id });
      return text({ status });
    }
  );

  server.registerTool(
    "list_invoices",
    {
      description: "Daftar invoice (filter status: unpaid/partial/paid/overdue).",
      inputSchema: { status: z.string().optional(), limit: z.number().default(20) },
    },
    async ({ status, limit }) => {
      const rows = status
        ? db.query(
            `SELECT i.inv_no, i.date, i.due_date, i.status, i.grand_total, i.paid_total,
                    (i.grand_total - i.paid_total) AS outstanding, c.name AS customer
             FROM invoices i JOIN customers c ON c.id = i.customer_id
             WHERE i.status = $s ORDER BY i.due_date LIMIT $limit`
          ).all({ $s: status, $limit: LIMIT(limit) })
        : db.query(
            `SELECT i.inv_no, i.date, i.due_date, i.status, i.grand_total, i.paid_total,
                    (i.grand_total - i.paid_total) AS outstanding, c.name AS customer
             FROM invoices i JOIN customers c ON c.id = i.customer_id
             ORDER BY i.due_date LIMIT $limit`
          ).all({ $limit: LIMIT(limit) });
      return text(rows);
    }
  );

  server.registerTool(
    "create_invoice",
    {
      description: "Buat invoice (PPN 11%) dari order berstatus shipped.",
      inputSchema: { so_no_or_id: z.string() },
    },
    async ({ so_no_or_id }) => {
      let o = db.query("SELECT id, customer_id, status, grand_total FROM orders WHERE id = $v").get({ $v: so_no_or_id }) as
        { id: string; customer_id: string; status: string; grand_total: number } | null;
      if (!o) o = db.query("SELECT id, customer_id, status, grand_total FROM orders WHERE so_no = $v").get({ $v: so_no_or_id }) as typeof o;
      if (!o) return toolError("Order not found");
      if (o.status !== "shipped") return toolError(`Order must be shipped (current: ${o.status})`);
      const cus = db.query("SELECT top_days FROM customers WHERE id = $id").get({ $id: o.customer_id }) as { top_days: number };
      const date = new Date().toISOString().slice(0, 10);
      const due = new Date();
      due.setDate(due.getDate() + cus.top_days);
      const dueStr = due.toISOString().slice(0, 10);
      const ppn = Math.round(o.grand_total * 0.11);
      const id = newId("INV");
      const no = `INV-${date.slice(0, 7).replace("-", "")}-${Math.floor(1000 + Math.random() * 9000)}`;
      try {
        db.transaction(() => {
          db.query("INSERT INTO invoices (id, inv_no, order_id, customer_id, date, due_date, subtotal, ppn, grand_total, status) VALUES ($id,$no,$o,$c,$date,$due,$sub,$ppn,$grand,'unpaid')")
            .run({
              $id: id, $no: no, $o: o!.id, $c: o!.customer_id, $date: date, $due: dueStr,
              $sub: o!.grand_total, $ppn: ppn, $grand: o!.grand_total + ppn,
            });
          const items = db.query("SELECT * FROM order_items WHERE order_id = $o").all({ $o: o!.id }) as
            { product_id: string; qty: number; price: number; discount: number; line_total: number }[];
          for (const it of items) {
            db.query("INSERT INTO invoice_items (id, invoice_id, product_id, qty, price, discount, line_total) VALUES ($id,$inv,$p,$q,$pr,$d,$t)")
              .run({ $id: newId("INVI"), $inv: id, $p: it.product_id, $q: it.qty, $pr: it.price, $d: it.discount, $t: it.line_total });
          }
          db.query("UPDATE orders SET status = 'invoiced' WHERE id = $id").run({ $id: o!.id });
        })();
      } catch {
        return toolError("Invoice already exists for this order");
      }
      return text({ inv_no: no, due_date: dueStr, grand_total: o.grand_total + ppn });
    }
  );

  server.registerTool(
    "record_payment",
    {
      description: "Catat pembayaran invoice (parsial boleh; tolak overpayment).",
      inputSchema: {
        inv_no_or_id: z.string(),
        amount: z.number(),
        method: z.string().default("transfer"),
      },
    },
    async ({ inv_no_or_id, amount, method }) => {
      let inv = db.query("SELECT id, grand_total, paid_total FROM invoices WHERE id = $v").get({ $v: inv_no_or_id }) as
        { id: string; grand_total: number; paid_total: number } | null;
      if (!inv) inv = db.query("SELECT id, grand_total, paid_total FROM invoices WHERE inv_no = $v").get({ $v: inv_no_or_id }) as typeof inv;
      if (!inv) return toolError("Invoice not found");
      if (amount <= 0) return toolError("Amount must be positive");
      if (amount - (inv.grand_total - inv.paid_total) > 0.01) return toolError("Overpayment rejected");
      const d = new Date();
      db.transaction(() => {
        db.query("INSERT INTO payments (id, pay_no, invoice_id, date, amount, method) VALUES ($id,$no,$inv,$date,$a,$m)")
          .run({
            $id: newId("PAY"),
            $no: `PAY-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}-${Math.floor(1000 + Math.random() * 9000)}`,
            $inv: inv!.id, $date: d.toISOString().slice(0, 10), $a: amount, $m: method,
          });
        db.query("UPDATE invoices SET paid_total = paid_total + $a WHERE id = $id").run({ $a: amount, $id: inv!.id });
      })();
      refreshInvoiceStatus(inv.id);
      return text(db.query("SELECT inv_no, status, grand_total, paid_total FROM invoices WHERE id = $id").get({ $id: inv.id }));
    }
  );

  server.registerTool(
    "list_customers",
    {
      description: "Cari/daftar customer (apotek, RS, klinik, puskesmas, toko obat).",
      inputSchema: { search: z.string().optional(), type: z.string().optional(), limit: z.number().default(20) },
    },
    async ({ search, type, limit }) => {
      const conds: string[] = [];
      const params: Record<string, unknown> = {};
      if (search) {
        conds.push("(name LIKE $q OR code LIKE $q OR city LIKE $q)");
        params.$q = `%${search}%`;
      }
      if (type) {
        conds.push("type = $t");
        params.$t = type;
      }
      const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
      return text(
        db.query(`SELECT code, name, type, city, phone, credit_limit, top_days FROM customers ${where} ORDER BY code LIMIT $limit`)
          .all({ ...params, $limit: LIMIT(limit) })
      );
    }
  );

  server.registerTool(
    "list_products",
    {
      description: "Daftar pricelist produk. Mendukung cursor pagination: pakai nextCursor untuk halaman berikutnya.",
      inputSchema: {
        search: z.string().optional(),
        limit: z.number().default(20).describe("Max baris per halaman (1-200)"),
        cursor: z.string().optional().describe("Cursor opaque dari nextCursor (halaman berikutnya)"),
      },
    },
    async ({ search, limit, cursor }) => {
      let offset = 0;
      try {
        offset = decodeCursor(cursor);
      } catch {
        return toolError("Invalid cursor");
      }
      const n = LIMIT(limit);
      const where = search ? "WHERE name LIKE $q OR sku LIKE $q" : "";
      const params: Record<string, unknown> = search ? { $q: `%${search}%` } : {};
      const total = (
        db.query(`SELECT COUNT(*) AS c FROM products ${where}`).get(params) as { c: number }
      ).c;
      const rows = db
        .query(
          `SELECT sku, name, category, unit, price FROM products
           ${where} ORDER BY sku LIMIT $n OFFSET $off`
        )
        .all({ ...params, $n: n + 1, $off: offset });
      const hasMore = rows.length > n;
      return text({
        items: hasMore ? rows.slice(0, n) : rows,
        total,
        nextCursor: hasMore ? encodeCursor(offset + n) : null,
      });
    }
  );

  return server;
}
