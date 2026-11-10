import { Elysia, t } from "elysia";
import db from "../db/connection";
import { newId } from "../lib/id";
import { ok, err } from "../lib/response";

export const distributors = new Elysia({ prefix: "/distributors" })
  .get("/", ({ query }) => {
    const q = query.search ? `%${query.search}%` : "%";
    const rows = db
      .query(
        `SELECT d.*,
                (SELECT COUNT(*) FROM customers WHERE distributor_id = d.id) AS total_customers,
                (SELECT COALESCE(SUM(o.grand_total),0) FROM orders o
                 WHERE o.distributor_id = d.id AND o.status != 'cancelled') AS total_revenue
         FROM distributors d WHERE d.name LIKE $q OR d.code LIKE $q OR d.region LIKE $q
         ORDER BY d.code`
      )
      .all({ $q: q });
    return ok(rows);
  }, { query: t.Object({ search: t.Optional(t.String()) }) })
  .get("/:id", ({ params }) => {
    const row = db.query("SELECT * FROM distributors WHERE id = $id").get({ $id: params.id }) as unknown;
    if (!row) err("Distributor not found", 404);
    return ok(row);
  })
  .post(
    "/",
    ({ body }) => {
      const id = newId("DST");
      try {
        db.query(
          `INSERT INTO distributors (id, code, name, region, address, contact, phone, type, credit_limit, top_days)
           VALUES ($id,$code,$name,$region,$address,$contact,$phone,$type,$credit_limit,$top_days)`
        ).run({
          $id: id, $code: body.code, $name: body.name, $region: body.region,
          $address: body.address ?? null, $contact: body.contact ?? null, $phone: body.phone ?? null,
          $type: body.type, $credit_limit: body.credit_limit, $top_days: body.top_days,
        });
      } catch {
        err("Distributor code already exists", 409);
      }
      return ok(db.query("SELECT * FROM distributors WHERE id = $id").get({ $id: id }), "Distributor created");
    },
    {
      body: t.Object({
        code: t.String({ minLength: 2 }),
        name: t.String({ minLength: 2 }),
        region: t.String({ minLength: 2 }),
        address: t.Optional(t.String()),
        contact: t.Optional(t.String()),
        phone: t.Optional(t.String()),
        type: t.String({ default: "sub" }),
        credit_limit: t.Number({ default: 500000000 }),
        top_days: t.Number({ default: 30 }),
      }),
    }
  )
  .delete("/:id", ({ params }) => {
    const r = db.query("DELETE FROM distributors WHERE id = $id").run({ $id: params.id });
    if (!r.changes) err("Distributor not found", 404);
    return ok(null, "Distributor deleted");
  });
