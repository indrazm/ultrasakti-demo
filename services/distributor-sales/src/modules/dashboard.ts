import { Elysia } from "elysia";
import db from "../db/connection";
import { ok } from "../lib/response";

export const dashboard = new Elysia({ prefix: "/dashboard" }).get("/summary", () => {
  const month = new Date().toISOString().slice(0, 7);
  const q = (sql: string, p: Record<string, unknown> = {}) =>
    (db.query(sql).get(p) as unknown as Record<string, number>);

  const revenue = q(
    "SELECT COALESCE(SUM(grand_total),0) AS s FROM orders WHERE status NOT IN ('draft','cancelled')"
  ).s;
  const invoiced = q("SELECT COALESCE(SUM(grand_total),0) AS s FROM invoices").s;
  const collected = q("SELECT COALESCE(SUM(paid_total),0) AS s FROM invoices").s;
  const outstanding = invoiced - collected;
  const overdue = q(
    "SELECT COALESCE(SUM(grand_total - paid_total),0) AS s FROM invoices WHERE status = 'overdue'"
  ).s;
  const orderCount = q("SELECT COUNT(*) AS c FROM orders WHERE status != 'cancelled'").c;
  const customerCount = q("SELECT COUNT(*) AS c FROM customers").c;
  const monthRevenue = q(
    "SELECT COALESCE(SUM(grand_total),0) AS s FROM orders WHERE substr(date,1,7) = $m AND status NOT IN ('draft','cancelled')",
    { $m: month }
  ).s;
  const monthTarget = q("SELECT COALESCE(SUM(monthly_target),0) AS s FROM sales_reps").s;

  const byStatus = db
    .query("SELECT status, COUNT(*) AS count, COALESCE(SUM(grand_total),0) AS total FROM orders GROUP BY status")
    .all();

  const topProducts = db
    .query(
      `SELECT p.sku, p.name, SUM(i.qty) AS qty, SUM(i.line_total) AS revenue
       FROM order_items i JOIN products p ON p.id = i.product_id
       JOIN orders o ON o.id = i.order_id WHERE o.status != 'cancelled'
       GROUP BY p.id ORDER BY revenue DESC LIMIT 8`
    )
    .all();

  const topCustomers = db
    .query(
      `SELECT c.code, c.name, c.city, COUNT(o.id) AS orders, SUM(o.grand_total) AS revenue
       FROM orders o JOIN customers c ON c.id = o.customer_id
       WHERE o.status != 'cancelled'
       GROUP BY c.id ORDER BY revenue DESC LIMIT 8`
    )
    .all();

  const leaderboard = db
    .query(
      `SELECT r.code, r.name, r.area, r.monthly_target,
              COUNT(o.id) AS orders,
              COALESCE(SUM(CASE WHEN o.status NOT IN ('draft','cancelled') THEN o.grand_total ELSE 0 END),0) AS revenue,
              COALESCE(SUM(CASE WHEN substr(o.date,1,7) = $m AND o.status NOT IN ('draft','cancelled') THEN o.grand_total ELSE 0 END),0) AS month_revenue
       FROM sales_reps r LEFT JOIN orders o ON o.sales_rep_id = r.id
       GROUP BY r.id ORDER BY revenue DESC`
    )
    .all({ $m: month }) as Record<string, any>[];
  const board = leaderboard.map((r) => ({
    ...r,
    achievement: r.monthly_target > 0 ? Math.round((r.month_revenue / r.monthly_target) * 100) : 0,
  }));

  const aging = db
    .query(
      `SELECT
         SUM(CASE WHEN date(due_date) >= date('now') THEN grand_total - paid_total ELSE 0 END) AS current,
         SUM(CASE WHEN date(due_date) < date('now') AND date(due_date) >= date('now','-30 days') THEN grand_total - paid_total ELSE 0 END) AS d1_30,
         SUM(CASE WHEN date(due_date) < date('now','-30 days') AND date(due_date) >= date('now','-60 days') THEN grand_total - paid_total ELSE 0 END) AS d31_60,
         SUM(CASE WHEN date(due_date) < date('now','-60 days') THEN grand_total - paid_total ELSE 0 END) AS d60
       FROM invoices WHERE status != 'paid'`
    )
    .get() as unknown;

  const recentOrders = db
    .query(
      `SELECT o.so_no, o.date, o.status, o.grand_total, c.name AS customer_name, r.name AS sales_name
       FROM orders o JOIN customers c ON c.id = o.customer_id
       JOIN sales_reps r ON r.id = o.sales_rep_id
       ORDER BY o.date DESC LIMIT 8`
    )
    .all();

  const overdueInvoices = db
    .query(
      `SELECT i.inv_no, i.due_date, (i.grand_total - i.paid_total) AS outstanding, c.name AS customer_name,
              CAST(julianday('now') - julianday(i.due_date) AS INTEGER) AS days_overdue
       FROM invoices i JOIN customers c ON c.id = i.customer_id
       WHERE i.status = 'overdue' ORDER BY i.due_date ASC LIMIT 10`
    )
    .all();

  return ok({
    kpi: {
      revenue, invoiced, collected, outstanding, overdue,
      orderCount, customerCount, monthRevenue, monthTarget,
      achievement: monthTarget > 0 ? Math.round((monthRevenue / monthTarget) * 100) : 0,
    },
    byStatus, topProducts, topCustomers, leaderboard: board, aging, recentOrders, overdueInvoices,
  });
});
