import { Elysia, t } from "elysia";
import db from "../db/connection";
import { newId } from "../lib/id";
import { ok, err, paginated } from "../lib/response";

export const products = new Elysia({ prefix: "/products" })
  .get(
    "/",
    ({ query }) => {
      const page = Number(query.page ?? 1);
      const limit = Math.min(Number(query.limit ?? 20), 200);
      const offset = (page - 1) * limit;
      const conds: string[] = [];
      const params: Record<string, unknown> = {};
      if (query.search) {
        conds.push("(name LIKE $q OR sku LIKE $q)");
        params.$q = `%${query.search}%`;
      }
      if (query.category) {
        conds.push("category = $category");
        params.$category = query.category;
      }
      const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
      const rows = db
        .query(`SELECT * FROM products ${where} ORDER BY sku LIMIT $limit OFFSET $offset`)
        .all({ ...params, $limit: limit, $offset: offset });
      const total = (db.query(`SELECT COUNT(*) AS c FROM products ${where}`).get(params) as { c: number }).c;
      return paginated(rows, total, page, limit);
    },
    {
      query: t.Object({
        search: t.Optional(t.String()),
        category: t.Optional(t.String()),
        page: t.Optional(t.String()),
        limit: t.Optional(t.String()),
      }),
    }
  )
  .post(
    "/",
    ({ body }) => {
      const id = newId("PRD");
      try {
        db.query(
          `INSERT INTO products (id, sku, name, category, unit, price)
           VALUES ($id,$sku,$name,$category,$unit,$price)`
        ).run({
          $id: id, $sku: body.sku, $name: body.name, $category: body.category,
          $unit: body.unit, $price: body.price,
        });
      } catch {
        err("SKU already exists", 409);
      }
      return ok(db.query("SELECT * FROM products WHERE id = $id").get({ $id: id }), "Product created");
    },
    {
      body: t.Object({
        sku: t.String({ minLength: 2 }),
        name: t.String({ minLength: 2 }),
        category: t.String({ default: "Obat Bebas" }),
        unit: t.String({ default: "box" }),
        price: t.Number({ default: 0 }),
      }),
    }
  )
  .delete("/:id", ({ params }) => {
    const r = db.query("DELETE FROM products WHERE id = $id").run({ $id: params.id });
    if (!r.changes) err("Product not found", 404);
    return ok(null, "Product deleted");
  });
