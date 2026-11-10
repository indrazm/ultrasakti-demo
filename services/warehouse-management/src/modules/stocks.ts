import { Elysia, t } from "elysia";
import db from "../db/connection";
import { ok } from "../lib/response";

export const stocks = new Elysia({ prefix: "/stocks" })
  .get(
    "/",
    ({ query }) => {
      const conds: string[] = [];
      const params: Record<string, unknown> = {};
      if (query.warehouseId) {
        conds.push("s.warehouse_id = $warehouseId");
        params.$warehouseId = query.warehouseId;
      }
      if (query.productId) {
        conds.push("s.product_id = $productId");
        params.$productId = query.productId;
      }
      if (query.search) {
        conds.push("(p.name LIKE $q OR p.sku LIKE $q OR s.batch_no LIKE $q)");
        params.$q = `%${query.search}%`;
      }
      const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
      let rows = db
        .query(
          `SELECT s.*, p.sku, p.name AS product_name, p.category, p.unit, p.min_stock,
                  w.code AS warehouse_code, w.name AS warehouse_name
           FROM stocks s
           JOIN products p ON p.id = s.product_id
           JOIN warehouses w ON w.id = s.warehouse_id
           ${where} ORDER BY s.updated_at DESC`
        )
        .all(params) as Record<string, any>[];

      if (query.lowStock === "true") {
        const totals = db
          .query(
            `SELECT s.product_id, SUM(s.qty) AS total, p.min_stock, p.name, p.sku
             FROM stocks s JOIN products p ON p.id = s.product_id
             GROUP BY s.product_id HAVING total <= p.min_stock`
          )
          .all() as { product_id: string }[];
        const ids = new Set(totals.map((r) => r.product_id));
        rows = rows.filter((r) => ids.has(r.product_id));
      }
      return ok(rows);
    },
    {
      query: t.Object({
        warehouseId: t.Optional(t.String()),
        productId: t.Optional(t.String()),
        search: t.Optional(t.String()),
        lowStock: t.Optional(t.String()),
      }),
    }
  )
  // Ringkasan stok per produk (total semua gudang)
  .get("/summary", () => {
    const rows = db
      .query(
        `SELECT p.id, p.sku, p.name, p.category, p.unit, p.min_stock,
                COALESCE(SUM(s.qty), 0) AS total_stock,
                CASE WHEN COALESCE(SUM(s.qty), 0) <= p.min_stock THEN 1 ELSE 0 END AS is_low
         FROM products p LEFT JOIN stocks s ON s.product_id = p.id
         GROUP BY p.id ORDER BY is_low DESC, total_stock ASC`
      )
      .all();
    return ok(rows);
  })
  // Stok expiring < X hari (default 90)
  .get(
    "/expiring",
    ({ query }) => {
      const days = Number(query.days ?? 90);
      const rows = db
        .query(
          `SELECT s.*, p.sku, p.name AS product_name, w.name AS warehouse_name,
                  CAST(julianday(s.expired_date) - julianday('now') AS INTEGER) AS days_left
           FROM stocks s
           JOIN products p ON p.id = s.product_id
           JOIN warehouses w ON w.id = s.warehouse_id
           WHERE s.expired_date IS NOT NULL
             AND date(s.expired_date) <= date('now', $plus)
           ORDER BY s.expired_date ASC`
        )
        .all({ $plus: `+${days} days` });
      return ok(rows);
    },
    { query: t.Object({ days: t.Optional(t.String()) }) }
  );
