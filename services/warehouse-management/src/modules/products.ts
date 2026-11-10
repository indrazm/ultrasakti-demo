import { Elysia, t } from "elysia";
import db from "../db/connection";
import { newId } from "../lib/id";
import { ok, paginated, err } from "../lib/response";

export const products = new Elysia({ prefix: "/products" })
  // List + search + filter kategori
  .get(
    "/",
    ({ query }) => {
      const page = Number(query.page ?? 1);
      const limit = Math.min(Number(query.limit ?? 20), 100);
      const offset = (page - 1) * limit;
      const conds: string[] = [];
      const params: Record<string, unknown> = {};
      if (query.search) {
        conds.push("(p.name LIKE $q OR p.sku LIKE $q)");
        params.$q = `%${query.search}%`;
      }
      if (query.category) {
        conds.push("p.category = $category");
        params.$category = query.category;
      }
      const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
      const rows = db
        .query(
          `SELECT p.*, COALESCE(SUM(s.qty), 0) AS total_stock
           FROM products p LEFT JOIN stocks s ON s.product_id = p.id
           ${where}
           GROUP BY p.id ORDER BY p.created_at DESC LIMIT $limit OFFSET $offset`
        )
        .all({ ...params, $limit: limit, $offset: offset });
      const total = (
        db.query(`SELECT COUNT(*) AS c FROM products p ${where}`).get(params) as { c: number }
      ).c;
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
  .get("/:id", ({ params }) => {
    const row = db.query("SELECT * FROM products WHERE id = $id").get({ $id: params.id }) as unknown;
    if (!row) err("Product not found", 404);
    const stocks = db
      .query(
        `SELECT s.*, w.code AS warehouse_code, w.name AS warehouse_name
         FROM stocks s JOIN warehouses w ON w.id = s.warehouse_id
         WHERE s.product_id = $id`
      )
      .all({ $id: params.id });
    return ok({ ...(row as object), stocks });
  })
  .post(
    "/",
    ({ body }) => {
      const id = newId("PRD");
      try {
        db.query(
          `INSERT INTO products (id, sku, name, category, unit, min_stock, price, description)
           VALUES ($id, $sku, $name, $category, $unit, $min_stock, $price, $description)`
        ).run({
          $id: id,
          $sku: body.sku,
          $name: body.name,
          $category: body.category,
          $unit: body.unit,
          $min_stock: body.min_stock,
          $price: body.price,
          $description: body.description ?? null,
        });
      } catch {
        err("SKU already exists", 409);
      }
      const row = db.query("SELECT * FROM products WHERE id = $id").get({ $id: id });
      return ok(row, "Product created");
    },
    {
      body: t.Object({
        sku: t.String({ minLength: 2 }),
        name: t.String({ minLength: 2 }),
        category: t.String({ default: "Obat Bebas" }),
        unit: t.String({ default: "box" }),
        min_stock: t.Number({ default: 10 }),
        price: t.Number({ default: 0 }),
        description: t.Optional(t.String()),
      }),
    }
  )
  .patch(
    "/:id",
    ({ params, body }) => {
      const exists = db.query("SELECT id FROM products WHERE id = $id").get({ $id: params.id });
      if (!exists) err("Product not found", 404);
      const fields = Object.entries(body).filter(([, v]) => v !== undefined);
      if (!fields.length) err("No fields to update");
      const set = fields.map(([k]) => `${k} = $${k}`).join(", ");
      const values: Record<string, unknown> = { $id: params.id };
      for (const [k, v] of fields) values[`$${k}`] = v;
      db.query(`UPDATE products SET ${set}, updated_at = datetime('now') WHERE id = $id`).run(values);
      return ok(db.query("SELECT * FROM products WHERE id = $id").get({ $id: params.id }), "Product updated");
    },
    {
      body: t.Object({
        sku: t.Optional(t.String()),
        name: t.Optional(t.String()),
        category: t.Optional(t.String()),
        unit: t.Optional(t.String()),
        min_stock: t.Optional(t.Number()),
        price: t.Optional(t.Number()),
        description: t.Optional(t.String()),
      }),
    }
  )
  .delete("/:id", ({ params }) => {
    const r = db.query("DELETE FROM products WHERE id = $id").run({ $id: params.id });
    if (!r.changes) err("Product not found", 404);
    return ok(null, "Product deleted");
  });
