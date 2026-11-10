import { Elysia, t } from "elysia";
import db from "../db/connection";
import { newId } from "../lib/id";
import { ok, err, paginated } from "../lib/response";

export const customers = new Elysia({ prefix: "/customers" })
  .get(
    "/",
    ({ query }) => {
      const page = Number(query.page ?? 1);
      const limit = Math.min(Number(query.limit ?? 20), 100);
      const offset = (page - 1) * limit;
      const conds: string[] = [];
      const params: Record<string, unknown> = {};
      if (query.search) {
        conds.push("(c.name LIKE $q OR c.code LIKE $q OR c.city LIKE $q)");
        params.$q = `%${query.search}%`;
      }
      if (query.type) {
        conds.push("c.type = $type");
        params.$type = query.type;
      }
      const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
      const rows = db
        .query(
          `SELECT c.*, d.name AS distributor_name,
                  (SELECT COUNT(*) FROM orders WHERE customer_id = c.id AND status != 'cancelled') AS total_orders,
                  (SELECT COALESCE(SUM(grand_total),0) FROM orders WHERE customer_id = c.id AND status != 'cancelled') AS total_revenue,
                  (SELECT COALESCE(SUM(grand_total - paid_total),0) FROM invoices WHERE customer_id = c.id AND status != 'paid') AS outstanding
           FROM customers c LEFT JOIN distributors d ON d.id = c.distributor_id
           ${where} ORDER BY c.code LIMIT $limit OFFSET $offset`
        )
        .all({ ...params, $limit: limit, $offset: offset });
      const total = (db.query(`SELECT COUNT(*) AS c FROM customers c ${where}`).get(params) as { c: number }).c;
      return paginated(rows, total, page, limit);
    },
    {
      query: t.Object({
        search: t.Optional(t.String()),
        type: t.Optional(t.String()),
        page: t.Optional(t.String()),
        limit: t.Optional(t.String()),
      }),
    }
  )
  .get("/:id", ({ params }) => {
    const row = db.query("SELECT * FROM customers WHERE id = $id").get({ $id: params.id }) as unknown;
    if (!row) err("Customer not found", 404);
    return ok(row);
  })
  .post(
    "/",
    ({ body }) => {
      const id = newId("CUS");
      try {
        db.query(
          `INSERT INTO customers (id, code, name, type, city, address, phone, credit_limit, top_days, distributor_id)
           VALUES ($id,$code,$name,$type,$city,$address,$phone,$credit_limit,$top_days,$distributor_id)`
        ).run({
          $id: id, $code: body.code, $name: body.name, $type: body.type, $city: body.city,
          $address: body.address ?? null, $phone: body.phone ?? null,
          $credit_limit: body.credit_limit, $top_days: body.top_days,
          $distributor_id: body.distributor_id ?? null,
        });
      } catch {
        err("Customer code already exists", 409);
      }
      return ok(db.query("SELECT * FROM customers WHERE id = $id").get({ $id: id }), "Customer created");
    },
    {
      body: t.Object({
        code: t.String({ minLength: 2 }),
        name: t.String({ minLength: 2 }),
        type: t.String({ default: "apotek" }),
        city: t.String({ minLength: 2 }),
        address: t.Optional(t.String()),
        phone: t.Optional(t.String()),
        credit_limit: t.Number({ default: 100000000 }),
        top_days: t.Number({ default: 30 }),
        distributor_id: t.Optional(t.String()),
      }),
    }
  )
  .delete("/:id", ({ params }) => {
    const r = db.query("DELETE FROM customers WHERE id = $id").run({ $id: params.id });
    if (!r.changes) err("Customer not found", 404);
    return ok(null, "Customer deleted");
  });
