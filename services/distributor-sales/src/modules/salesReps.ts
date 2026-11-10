import { Elysia, t } from "elysia";
import db from "../db/connection";
import { newId } from "../lib/id";
import { ok, err } from "../lib/response";

export const salesReps = new Elysia({ prefix: "/sales-reps" })
  .get("/", () => {
    const rows = db
      .query(
        `SELECT r.*,
                (SELECT COUNT(*) FROM orders WHERE sales_rep_id = r.id AND status != 'cancelled') AS total_orders,
                (SELECT COALESCE(SUM(grand_total),0) FROM orders WHERE sales_rep_id = r.id AND status != 'cancelled') AS total_revenue
         FROM sales_reps r ORDER BY r.code`
      )
      .all();
    return ok(rows);
  })
  .get("/:id", ({ params }) => {
    const row = db.query("SELECT * FROM sales_reps WHERE id = $id").get({ $id: params.id }) as unknown;
    if (!row) err("Sales rep not found", 404);
    return ok(row);
  })
  .post(
    "/",
    ({ body }) => {
      const id = newId("SLR");
      try {
        db.query(
          `INSERT INTO sales_reps (id, code, name, area, phone, monthly_target)
           VALUES ($id,$code,$name,$area,$phone,$monthly_target)`
        ).run({
          $id: id, $code: body.code, $name: body.name, $area: body.area,
          $phone: body.phone ?? null, $monthly_target: body.monthly_target,
        });
      } catch {
        err("Sales rep code already exists", 409);
      }
      return ok(db.query("SELECT * FROM sales_reps WHERE id = $id").get({ $id: id }), "Sales rep created");
    },
    {
      body: t.Object({
        code: t.String({ minLength: 2 }),
        name: t.String({ minLength: 2 }),
        area: t.String({ minLength: 2 }),
        phone: t.Optional(t.String()),
        monthly_target: t.Number({ default: 200000000 }),
      }),
    }
  )
  .delete("/:id", ({ params }) => {
    const r = db.query("DELETE FROM sales_reps WHERE id = $id").run({ $id: params.id });
    if (!r.changes) err("Sales rep not found", 404);
    return ok(null, "Sales rep deleted");
  });
