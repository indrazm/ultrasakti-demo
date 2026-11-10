import { Elysia, t } from "elysia";
import db from "../db/connection";
import { newId } from "../lib/id";
import { ok } from "../lib/response";

export const opname = new Elysia({ prefix: "/opname" })
  .get("/", () => {
    const rows = db
      .query(
        `SELECT o.*, p.sku, p.name AS product_name, w.name AS warehouse_name
         FROM opnames o
         JOIN products p ON p.id = o.product_id
         JOIN warehouses w ON w.id = o.warehouse_id
         ORDER BY o.created_at DESC LIMIT 100`
      )
      .all();
    return ok(rows);
  })
  .post(
    "/",
    ({ body }) => {
      const stock = db
        .query("SELECT id, qty FROM stocks WHERE product_id = $p AND warehouse_id = $w AND batch_no = $b")
        .get({ $p: body.product_id, $w: body.warehouse_id, $b: body.batch_no ?? "-" }) as
        { id: string; qty: number } | null;
      const systemQty = stock?.qty ?? 0;
      const diff = body.physical_qty - systemQty;
      const id = newId("OPN");

      const tx = db.transaction(() => {
        db.query(
          `INSERT INTO opnames (id, product_id, warehouse_id, batch_no, system_qty, physical_qty, diff, reason, date)
           VALUES ($id, $p, $w, $b, $sys, $phy, $diff, $reason, $date)`
        ).run({
          $id: id, $p: body.product_id, $w: body.warehouse_id, $b: body.batch_no ?? "-",
          $sys: systemQty, $phy: body.physical_qty, $diff: diff,
          $reason: body.reason ?? null,
          $date: body.date ?? new Date().toISOString().slice(0, 10),
        });
        // sesuaikan stok sistem = fisik
        if (stock) {
          db.query("UPDATE stocks SET qty = $q, updated_at = datetime('now') WHERE id = $id").run({
            $q: body.physical_qty, $id: stock.id,
          });
        } else {
          db.query(
            `INSERT INTO stocks (id, product_id, warehouse_id, batch_no, qty)
             VALUES ($id, $p, $w, $b, $q)`
          ).run({ $id: newId("STK"), $p: body.product_id, $w: body.warehouse_id, $b: body.batch_no ?? "-", $q: body.physical_qty });
        }
      });
      tx();
      if (diff === 0) return ok({ id, diff }, "Opname recorded — stock matches");
      return ok({ id, system_qty: systemQty, physical_qty: body.physical_qty, diff }, "Opname recorded, stock adjusted");
    },
    {
      body: t.Object({
        product_id: t.String(),
        warehouse_id: t.String(),
        batch_no: t.String({ default: "-" }),
        physical_qty: t.Number({ minimum: 0 }),
        reason: t.Optional(t.String()),
        date: t.Optional(t.String()),
      }),
    }
  );
