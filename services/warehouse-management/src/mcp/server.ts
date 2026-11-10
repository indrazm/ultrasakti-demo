import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import db from "../db/connection";
import { newId, trxNo } from "../lib/id";

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

/**
 * MCP server factory untuk PT Ultra Sakti Warehouse.
 * Dipakai stateless (fresh instance per request, tanpa auth) — lihat src/index.ts.
 */
export function createWarehouseMcpServer(): McpServer {
  const server = new McpServer({ name: "ultra-sakti-warehouse", version: "1.0.0" });

  server.registerTool(
    "dashboard_summary",
    {
      description: "Ringkasan KPI gudang: total produk/gudang/supplier/stok, produk stok menipis, stok expiring ≤90 hari, transaksi terakhir.",
      inputSchema: {},
    },
    async () => {
      const one = (sql: string) => (db.query(sql).get() as Record<string, number>);
      const kpi = {
        totalProducts: one("SELECT COUNT(*) AS c FROM products").c,
        totalWarehouses: one("SELECT COUNT(*) AS c FROM warehouses").c,
        totalSuppliers: one("SELECT COUNT(*) AS c FROM suppliers").c,
        totalStock: (db.query("SELECT COALESCE(SUM(qty),0) AS s FROM stocks").get() as { s: number }).s,
        inboundCount: one("SELECT COUNT(*) AS c FROM inbound_headers").c,
        outboundCount: one("SELECT COUNT(*) AS c FROM outbound_headers").c,
      };
      const lowStock = db
        .query(
          `SELECT p.sku, p.name, p.min_stock, COALESCE(SUM(s.qty),0) AS total_stock
           FROM products p LEFT JOIN stocks s ON s.product_id = p.id
           GROUP BY p.id HAVING total_stock <= p.min_stock LIMIT 20`
        )
        .all();
      const expiring = db
        .query(
          `SELECT p.sku, p.name AS product_name, s.batch_no, s.expired_date, s.qty,
                  CAST(julianday(s.expired_date) - julianday('now') AS INTEGER) AS days_left
           FROM stocks s JOIN products p ON p.id = s.product_id
           WHERE s.expired_date IS NOT NULL AND date(s.expired_date) <= date('now', '+90 days')
           ORDER BY s.expired_date ASC LIMIT 20`
        )
        .all();
      return text({ kpi, lowStock, expiring });
    }
  );

  server.registerTool(
    "list_products",
    {
      description: "Cari/daftar produk obat & alkes (beserta total stok). Mendukung cursor pagination: pakai nextCursor untuk halaman berikutnya.",
      inputSchema: {
        search: z.string().optional().describe("Cari nama atau SKU"),
        category: z.string().optional().describe("Filter kategori"),
        limit: z.number().default(20).describe("Max baris per halaman (1-200)"),
        cursor: z.string().optional().describe("Cursor opaque dari nextCursor (halaman berikutnya)"),
      },
    },
    async ({ search, category, limit, cursor }) => {
      let offset = 0;
      try {
        offset = decodeCursor(cursor);
      } catch {
        return toolError("Invalid cursor");
      }
      const n = LIMIT(limit);
      const conds: string[] = [];
      const params: Record<string, unknown> = {};
      if (search) {
        conds.push("(p.name LIKE $q OR p.sku LIKE $q)");
        params.$q = `%${search}%`;
      }
      if (category) {
        conds.push("p.category = $category");
        params.$category = category;
      }
      const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
      const total = (
        db.query(`SELECT COUNT(*) AS c FROM products p ${where}`).get(params) as { c: number }
      ).c;
      const rows = db
        .query(
          `SELECT p.*, COALESCE(SUM(s.qty), 0) AS total_stock
           FROM products p LEFT JOIN stocks s ON s.product_id = p.id
           ${where} GROUP BY p.id ORDER BY p.name LIMIT $n OFFSET $off`
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

  server.registerTool(
    "get_product",
    {
      description: "Detail satu produk + sebaran stok per gudang/batch.",
      inputSchema: { id: z.string().describe("ID produk (atau SKU bila sku_or_id=true)") },
    },
    async ({ id }) => {
      let row = db.query("SELECT * FROM products WHERE id = $id").get({ $id: id }) as unknown;
      if (!row) row = db.query("SELECT * FROM products WHERE sku = $s").get({ $s: id }) as unknown;
      if (!row) return toolError(`Product not found: ${id}`);
      const pid = (row as { id: string }).id;
      const stocks = db
        .query(
          `SELECT s.*, w.code AS warehouse_code, w.name AS warehouse_name
           FROM stocks s JOIN warehouses w ON w.id = s.warehouse_id
           WHERE s.product_id = $id`
        )
        .all({ $id: pid });
      return text({ ...(row as object), stocks });
    }
  );

  server.registerTool(
    "create_product",
    {
      description: "Tambah produk baru ke master.",
      inputSchema: {
        sku: z.string().describe("Kode SKU unik, mis. US-B-099"),
        name: z.string().describe("Nama produk"),
        category: z.string().default("Obat Bebas"),
        unit: z.string().default("box"),
        min_stock: z.number().default(10),
        price: z.number().default(0),
        description: z.string().optional(),
      },
    },
    async (p) => {
      const id = newId("PRD");
      try {
        db.query(
          `INSERT INTO products (id, sku, name, category, unit, min_stock, price, description)
           VALUES ($id,$sku,$name,$category,$unit,$min_stock,$price,$description)`
        ).run({
          $id: id, $sku: p.sku, $name: p.name, $category: p.category, $unit: p.unit,
          $min_stock: p.min_stock, $price: p.price, $description: p.description ?? null,
        });
      } catch {
        return toolError(`SKU already exists: ${p.sku}`);
      }
      return text(db.query("SELECT * FROM products WHERE id = $id").get({ $id: id }));
    }
  );

  server.registerTool(
    "list_warehouses",
    { description: "Daftar semua gudang + total stok & SKU.", inputSchema: {} },
    async () => {
      const rows = db
        .query(
          `SELECT w.*, COALESCE(SUM(s.qty), 0) AS total_stock, COUNT(DISTINCT s.product_id) AS total_sku
           FROM warehouses w LEFT JOIN stocks s ON s.warehouse_id = w.id
           GROUP BY w.id ORDER BY w.code`
        )
        .all();
      return text(rows);
    }
  );

  server.registerTool(
    "list_suppliers",
    {
      description: "Daftar supplier/distributor.",
      inputSchema: { search: z.string().optional() },
    },
    async ({ search }) => {
      const rows = db
        .query("SELECT * FROM suppliers WHERE name LIKE $q OR code LIKE $q ORDER BY code")
        .all({ $q: `%${search ?? ""}%` });
      return text(rows);
    }
  );

  server.registerTool(
    "check_stock",
    {
      description: "Cek stok per batch/gudang. Bisa filter produk, gudang, atau khusus stok menipis.",
      inputSchema: {
        search: z.string().optional().describe("Cari nama/SKU/batch"),
        product_id: z.string().optional(),
        warehouse_id: z.string().optional(),
        low_stock_only: z.boolean().default(false),
        limit: z.number().default(50),
      },
    },
    async ({ search, product_id, warehouse_id, low_stock_only, limit }) => {
      const conds: string[] = [];
      const params: Record<string, unknown> = {};
      if (warehouse_id) {
        conds.push("s.warehouse_id = $w");
        params.$w = warehouse_id;
      }
      if (product_id) {
        conds.push("s.product_id = $p");
        params.$p = product_id;
      }
      if (search) {
        conds.push("(p.name LIKE $q OR p.sku LIKE $q OR s.batch_no LIKE $q)");
        params.$q = `%${search}%`;
      }
      const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
      let rows = db
        .query(
          `SELECT s.product_id, s.warehouse_id, s.qty, s.batch_no, s.expired_date, s.location,
                  p.sku, p.name AS product_name, p.unit, p.min_stock,
                  w.code AS warehouse_code, w.name AS warehouse_name
           FROM stocks s
           JOIN products p ON p.id = s.product_id
           JOIN warehouses w ON w.id = s.warehouse_id
           ${where} ORDER BY s.qty ASC LIMIT $limit`
        )
        .all({ ...params, $limit: LIMIT(limit) }) as Record<string, unknown>[];
      if (low_stock_only) {
        const totals = db
          .query(
            `SELECT s.product_id FROM stocks s JOIN products p ON p.id = s.product_id
             GROUP BY s.product_id HAVING SUM(s.qty) <= p.min_stock`
          )
          .all() as { product_id: string }[];
        const ids = new Set(totals.map((r) => r.product_id));
        rows = rows.filter((r) => ids.has(r.product_id as string));
      }
      return text(rows);
    }
  );

  server.registerTool(
    "expiring_stock",
    {
      description: "Stok yang expired / mendekati expired dalam X hari.",
      inputSchema: { days: z.number().default(90) },
    },
    async ({ days }) => {
      const rows = db
        .query(
          `SELECT p.sku, p.name AS product_name, s.batch_no, s.expired_date, s.qty,
                  w.name AS warehouse_name,
                  CAST(julianday(s.expired_date) - julianday('now') AS INTEGER) AS days_left
           FROM stocks s
           JOIN products p ON p.id = s.product_id
           JOIN warehouses w ON w.id = s.warehouse_id
           WHERE s.expired_date IS NOT NULL AND date(s.expired_date) <= date('now', $plus)
           ORDER BY s.expired_date ASC LIMIT 50`
        )
        .all({ $plus: `+${LIMIT(days)} days` });
      return text(rows);
    }
  );

  const itemSchema = z.object({
    product_id: z.string(),
    batch_no: z.string().default("-"),
    qty: z.number().min(1),
  });

  server.registerTool(
    "create_inbound",
    {
      description: "Catat penerimaan barang dari supplier. Stok otomatis bertambah (per batch).",
      inputSchema: {
        warehouse_id: z.string(),
        supplier_id: z.string().optional(),
        note: z.string().optional().describe("No. PO / keterangan"),
        items: z.array(itemSchema.extend({
          expired_date: z.string().optional().describe("YYYY-MM-DD"),
          price: z.number().optional(),
        })).min(1),
      },
    },
    async ({ warehouse_id, supplier_id, note, items }) => {
      if (!db.query("SELECT id FROM warehouses WHERE id = $id").get({ $id: warehouse_id }))
        return toolError("Warehouse not found");
      if (supplier_id && !db.query("SELECT id FROM suppliers WHERE id = $id").get({ $id: supplier_id }))
        return toolError("Supplier not found");
      const id = newId("IN");
      const no = trxNo("IN");
      try {
        db.transaction(() => {
          db.query(
            `INSERT INTO inbound_headers (id, trx_no, warehouse_id, supplier_id, date, note)
             VALUES ($id,$no,$w,$s,$d,$n)`
          ).run({
            $id: id, $no: no, $w: warehouse_id, $s: supplier_id ?? null,
            $d: new Date().toISOString().slice(0, 10), $n: note ?? null,
          });
          for (const it of items) {
            if (!db.query("SELECT id FROM products WHERE id = $id").get({ $id: it.product_id }))
              throw new Error(`Product not found: ${it.product_id}`);
            db.query(
              `INSERT INTO inbound_items (id, inbound_id, product_id, batch_no, expired_date, qty, price)
               VALUES ($id,$h,$p,$b,$exp,$q,$pr)`
            ).run({
              $id: newId("INI"), $h: id, $p: it.product_id, $b: it.batch_no ?? "-",
              $exp: it.expired_date ?? null, $q: it.qty, $pr: it.price ?? 0,
            });
            const st = db
              .query("SELECT id FROM stocks WHERE product_id = $p AND warehouse_id = $w AND batch_no = $b")
              .get({ $p: it.product_id, $w: warehouse_id, $b: it.batch_no ?? "-" }) as { id: string } | null;
            if (st) {
              db.query("UPDATE stocks SET qty = qty + $q, updated_at = datetime('now') WHERE id = $id")
                .run({ $q: it.qty, $id: st.id });
            } else {
              db.query("INSERT INTO stocks (id, product_id, warehouse_id, batch_no, expired_date, qty) VALUES ($id,$p,$w,$b,$exp,$q)")
                .run({
                  $id: newId("STK"), $p: it.product_id, $w: warehouse_id,
                  $b: it.batch_no ?? "-", $exp: it.expired_date ?? null, $q: it.qty,
                });
            }
          }
        })();
      } catch (e: any) {
        return toolError(e.message);
      }
      return text({ trx_no: no, message: "Inbound created, stock added" });
    }
  );

  server.registerTool(
    "create_outbound",
    {
      description: "Catat pengeluaran barang ke cabang/customer. Stok otomatis berkurang; ditolak bila stok kurang.",
      inputSchema: {
        warehouse_id: z.string(),
        destination: z.string(),
        note: z.string().optional().describe("No. surat jalan / keterangan"),
        items: z.array(itemSchema).min(1),
      },
    },
    async ({ warehouse_id, destination, note, items }) => {
      if (!db.query("SELECT id FROM warehouses WHERE id = $id").get({ $id: warehouse_id }))
        return toolError("Warehouse not found");
      const id = newId("OUT");
      const no = trxNo("OUT");
      try {
        db.transaction(() => {
          db.query(
            `INSERT INTO outbound_headers (id, trx_no, warehouse_id, destination, date, note)
             VALUES ($id,$no,$w,$d,$dt,$n)`
          ).run({
            $id: id, $no: no, $w: warehouse_id, $d: destination,
            $dt: new Date().toISOString().slice(0, 10), $n: note ?? null,
          });
          for (const it of items) {
            const st = db
              .query("SELECT id, qty FROM stocks WHERE product_id = $p AND warehouse_id = $w AND batch_no = $b")
              .get({ $p: it.product_id, $w: warehouse_id, $b: it.batch_no ?? "-" }) as
              { id: string; qty: number } | null;
            if (!st) throw new Error(`No stock for product ${it.product_id} batch ${it.batch_no}`);
            if (st.qty < it.qty) throw new Error(`Insufficient stock: available ${st.qty}, requested ${it.qty}`);
            db.query("INSERT INTO outbound_items (id, outbound_id, product_id, batch_no, qty) VALUES ($id,$h,$p,$b,$q)")
              .run({ $id: newId("OUTI"), $h: id, $p: it.product_id, $b: it.batch_no ?? "-", $q: it.qty });
            db.query("UPDATE stocks SET qty = qty - $q, updated_at = datetime('now') WHERE id = $id")
              .run({ $q: it.qty, $id: st.id });
          }
        })();
      } catch (e: any) {
        return toolError(e.message);
      }
      return text({ trx_no: no, message: "Outbound created, stock deducted" });
    }
  );

  server.registerTool(
    "record_opname",
    {
      description: "Catat stock opname: bandingkan qty sistem vs fisik, stok otomatis disesuaikan ke qty fisik.",
      inputSchema: {
        product_id: z.string(),
        warehouse_id: z.string(),
        batch_no: z.string().default("-"),
        physical_qty: z.number().min(0),
        reason: z.string().optional(),
      },
    },
    async ({ product_id, warehouse_id, batch_no, physical_qty, reason }) => {
      const st = db
        .query("SELECT id, qty FROM stocks WHERE product_id = $p AND warehouse_id = $w AND batch_no = $b")
        .get({ $p: product_id, $w: warehouse_id, $b: batch_no ?? "-" }) as
        { id: string; qty: number } | null;
      const systemQty = st?.qty ?? 0;
      const id = newId("OPN");
      db.transaction(() => {
        db.query(
          `INSERT INTO opnames (id, product_id, warehouse_id, batch_no, system_qty, physical_qty, diff, reason, date)
           VALUES ($id,$p,$w,$b,$sys,$phy,$diff,$reason,$date)`
        ).run({
          $id: id, $p: product_id, $w: warehouse_id, $b: batch_no ?? "-",
          $sys: systemQty, $phy: physical_qty, $diff: physical_qty - systemQty,
          $reason: reason ?? null, $date: new Date().toISOString().slice(0, 10),
        });
        if (st) {
          db.query("UPDATE stocks SET qty = $q, updated_at = datetime('now') WHERE id = $id")
            .run({ $q: physical_qty, $id: st.id });
        } else {
          db.query("INSERT INTO stocks (id, product_id, warehouse_id, batch_no, qty) VALUES ($id,$p,$w,$b,$q)")
            .run({ $id: newId("STK"), $p: product_id, $w: warehouse_id, $b: batch_no ?? "-", $q: physical_qty });
        }
      })();
      return text({ system_qty: systemQty, physical_qty, diff: physical_qty - systemQty });
    }
  );

  return server;
}
