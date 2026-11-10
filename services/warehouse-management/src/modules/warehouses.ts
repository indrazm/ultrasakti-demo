import { Elysia, t } from "elysia";
import db from "../db/connection";
import { newId } from "../lib/id";
import { ok, err } from "../lib/response";

export const warehouses = new Elysia({ prefix: "/warehouses" })
  .get("/", () => {
    const rows = db
      .query(
        `SELECT w.*, COALESCE(SUM(s.qty), 0) AS total_stock,
                COUNT(DISTINCT s.product_id) AS total_sku
         FROM warehouses w LEFT JOIN stocks s ON s.warehouse_id = w.id
         GROUP BY w.id ORDER BY w.created_at`
      )
      .all();
    return ok(rows);
  })
  .get("/:id", ({ params }) => {
    const row = db.query("SELECT * FROM warehouses WHERE id = $id").get({ $id: params.id }) as unknown;
    if (!row) err("Warehouse not found", 404);
    return ok(row);
  })
  .post(
    "/",
    ({ body }) => {
      const id = newId("WH");
      try {
        db.query(
          `INSERT INTO warehouses (id, code, name, address, type)
           VALUES ($id, $code, $name, $address, $type)`
        ).run({
          $id: id, $code: body.code, $name: body.name,
          $address: body.address ?? null, $type: body.type,
        });
      } catch {
        err("Warehouse code already exists", 409);
      }
      return ok(db.query("SELECT * FROM warehouses WHERE id = $id").get({ $id: id }), "Warehouse created");
    },
    {
      body: t.Object({
        code: t.String({ minLength: 2 }),
        name: t.String({ minLength: 2 }),
        address: t.Optional(t.String()),
        type: t.String({ default: "pusat" }),
      }),
    }
  )
  .patch(
    "/:id",
    ({ params, body }) => {
      const exists = db.query("SELECT id FROM warehouses WHERE id = $id").get({ $id: params.id });
      if (!exists) err("Warehouse not found", 404);
      const fields = Object.entries(body).filter(([, v]) => v !== undefined);
      if (!fields.length) err("No fields to update");
      const set = fields.map(([k]) => `${k} = $${k}`).join(", ");
      const values: Record<string, unknown> = { $id: params.id };
      for (const [k, v] of fields) values[`$${k}`] = v;
      db.query(`UPDATE warehouses SET ${set} WHERE id = $id`).run(values);
      return ok(db.query("SELECT * FROM warehouses WHERE id = $id").get({ $id: params.id }), "Warehouse updated");
    },
    {
      body: t.Object({
        code: t.Optional(t.String()),
        name: t.Optional(t.String()),
        address: t.Optional(t.String()),
        type: t.Optional(t.String()),
      }),
    }
  )
  .delete("/:id", ({ params }) => {
    const r = db.query("DELETE FROM warehouses WHERE id = $id").run({ $id: params.id });
    if (!r.changes) err("Warehouse not found", 404);
    return ok(null, "Warehouse deleted");
  });
