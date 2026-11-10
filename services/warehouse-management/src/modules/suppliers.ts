import { Elysia, t } from "elysia";
import db from "../db/connection";
import { newId } from "../lib/id";
import { ok, err } from "../lib/response";

export const suppliers = new Elysia({ prefix: "/suppliers" })
  .get("/", ({ query }) => {
    const q = query.search ? `%${query.search}%` : "%";
    const rows = db
      .query("SELECT * FROM suppliers WHERE name LIKE $q OR code LIKE $q ORDER BY created_at DESC")
      .all({ $q: q });
    return ok(rows);
  }, { query: t.Object({ search: t.Optional(t.String()) }) })
  .get("/:id", ({ params }) => {
    const row = db.query("SELECT * FROM suppliers WHERE id = $id").get({ $id: params.id }) as unknown;
    if (!row) err("Supplier not found", 404);
    return ok(row);
  })
  .post(
    "/",
    ({ body }) => {
      const id = newId("SUP");
      try {
        db.query(
          `INSERT INTO suppliers (id, code, name, contact, phone, email, address)
           VALUES ($id, $code, $name, $contact, $phone, $email, $address)`
        ).run({
          $id: id, $code: body.code, $name: body.name,
          $contact: body.contact ?? null, $phone: body.phone ?? null,
          $email: body.email ?? null, $address: body.address ?? null,
        });
      } catch {
        err("Supplier code already exists", 409);
      }
      return ok(db.query("SELECT * FROM suppliers WHERE id = $id").get({ $id: id }), "Supplier created");
    },
    {
      body: t.Object({
        code: t.String({ minLength: 2 }),
        name: t.String({ minLength: 2 }),
        contact: t.Optional(t.String()),
        phone: t.Optional(t.String()),
        email: t.Optional(t.String()),
        address: t.Optional(t.String()),
      }),
    }
  )
  .patch(
    "/:id",
    ({ params, body }) => {
      const exists = db.query("SELECT id FROM suppliers WHERE id = $id").get({ $id: params.id });
      if (!exists) err("Supplier not found", 404);
      const fields = Object.entries(body).filter(([, v]) => v !== undefined);
      if (!fields.length) err("No fields to update");
      const set = fields.map(([k]) => `${k} = $${k}`).join(", ");
      const values: Record<string, unknown> = { $id: params.id };
      for (const [k, v] of fields) values[`$${k}`] = v;
      db.query(`UPDATE suppliers SET ${set} WHERE id = $id`).run(values);
      return ok(db.query("SELECT * FROM suppliers WHERE id = $id").get({ $id: params.id }), "Supplier updated");
    },
    {
      body: t.Object({
        code: t.Optional(t.String()),
        name: t.Optional(t.String()),
        contact: t.Optional(t.String()),
        phone: t.Optional(t.String()),
        email: t.Optional(t.String()),
        address: t.Optional(t.String()),
      }),
    }
  )
  .delete("/:id", ({ params }) => {
    const r = db.query("DELETE FROM suppliers WHERE id = $id").run({ $id: params.id });
    if (!r.changes) err("Supplier not found", 404);
    return ok(null, "Supplier deleted");
  });
