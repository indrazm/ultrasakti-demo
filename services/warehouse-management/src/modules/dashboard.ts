import { Elysia } from "elysia";
import db from "../db/connection";
import { ok } from "../lib/response";

export const dashboard = new Elysia({ prefix: "/dashboard" }).get("/summary", () => {
  const totalProducts = (db.query("SELECT COUNT(*) AS c FROM products").get() as { c: number }).c;
  const totalWarehouses = (db.query("SELECT COUNT(*) AS c FROM warehouses").get() as { c: number }).c;
  const totalSuppliers = (db.query("SELECT COUNT(*) AS c FROM suppliers").get() as { c: number }).c;
  const totalStock = (
    db.query("SELECT COALESCE(SUM(qty),0) AS s FROM stocks").get() as { s: number }
  ).s;
  const inboundCount = (db.query("SELECT COUNT(*) AS c FROM inbound_headers").get() as { c: number }).c;
  const outboundCount = (db.query("SELECT COUNT(*) AS c FROM outbound_headers").get() as { c: number }).c;

  const lowStock = db
    .query(
      `SELECT p.id, p.sku, p.name, p.min_stock, COALESCE(SUM(s.qty),0) AS total_stock
       FROM products p LEFT JOIN stocks s ON s.product_id = p.id
       GROUP BY p.id HAVING total_stock <= p.min_stock LIMIT 10`
    )
    .all();

  const expiring = db
    .query(
      `SELECT s.batch_no, s.expired_date, s.qty, p.sku, p.name AS product_name,
              w.name AS warehouse_name,
              CAST(julianday(s.expired_date) - julianday('now') AS INTEGER) AS days_left
       FROM stocks s
       JOIN products p ON p.id = s.product_id
       JOIN warehouses w ON w.id = s.warehouse_id
       WHERE s.expired_date IS NOT NULL
         AND date(s.expired_date) <= date('now', '+90 days')
       ORDER BY s.expired_date ASC LIMIT 10`
    )
    .all();

  const recentInbound = db
    .query(
      `SELECT h.trx_no, h.date, w.name AS warehouse_name, s.name AS supplier_name,
              (SELECT COALESCE(SUM(qty),0) FROM inbound_items WHERE inbound_id = h.id) AS total_qty
       FROM inbound_headers h
       LEFT JOIN warehouses w ON w.id = h.warehouse_id
       LEFT JOIN suppliers s ON s.id = h.supplier_id
       ORDER BY h.created_at DESC LIMIT 5`
    )
    .all();

  const recentOutbound = db
    .query(
      `SELECT h.trx_no, h.date, h.destination, w.name AS warehouse_name,
              (SELECT COALESCE(SUM(qty),0) FROM outbound_items WHERE outbound_id = h.id) AS total_qty
       FROM outbound_headers h
       LEFT JOIN warehouses w ON w.id = h.warehouse_id
       ORDER BY h.created_at DESC LIMIT 5`
    )
    .all();

  const stockByCategory = db
    .query(
      `SELECT p.category, COALESCE(SUM(s.qty),0) AS total_qty, COUNT(DISTINCT p.id) AS total_sku
       FROM products p LEFT JOIN stocks s ON s.product_id = p.id
       GROUP BY p.category`
    )
    .all();

  return ok({
    kpi: {
      totalProducts,
      totalWarehouses,
      totalSuppliers,
      totalStock,
      inboundCount,
      outboundCount,
      lowStockCount: (lowStock as unknown[]).length,
    },
    lowStock,
    expiring,
    recentInbound,
    recentOutbound,
    stockByCategory,
  });
});
