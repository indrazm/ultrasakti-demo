import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { swagger } from "@elysiajs/swagger";
import { mcp } from "elysiajs-mcp";
import db from "./db/connection";
import { createWarehouseMcpServer } from "./mcp/server";
import { products } from "./modules/products";
import { warehouses } from "./modules/warehouses";
import { suppliers } from "./modules/suppliers";
import { stocks } from "./modules/stocks";
import { inbound } from "./modules/inbound";
import { outbound } from "./modules/outbound";
import { opname } from "./modules/opname";
import { dashboard } from "./modules/dashboard";

const app = new Elysia()
  .use(cors())
  // MCP server (Streamable HTTP, stateful session, tanpa auth) → POST/GET/DELETE /mcp
  .use(mcp({ server: () => createWarehouseMcpServer() }))
  // Serve React UI (bundled via client/build.ts → public/)
  .get("/", () => Bun.file("./public/index.html"))
  .get("/app.js", () => Bun.file("./public/app.js"))
  .get("/styles.css", () => Bun.file("./public/styles.css"))
  .use(
    swagger({
      path: "/swagger",
      documentation: {
        info: {
          title: "Ultra Sakti Warehouse API",
          version: "1.0.0",
          description: "Mock Warehouse Management System — PT Ultra Sakti (Bun + Elysia + SQLite + React)",
        },
        tags: [
          { name: "General", description: "Health & root" },
          { name: "Dashboard", description: "KPI & ringkasan" },
          { name: "Products", description: "Master obat & alkes" },
          { name: "Warehouses", description: "Master gudang" },
          { name: "Suppliers", description: "Master supplier" },
          { name: "Stocks", description: "Stok, low stock, expiring" },
          { name: "Inbound", description: "Penerimaan barang" },
          { name: "Outbound", description: "Pengeluaran barang" },
          { name: "Opname", description: "Stock opname" },
        ],
      },
    })
  )
  .onError(({ error, set }) => {
    const status = (error as any)?.status ?? 500;
    set.status = status;
    return { success: false, message: (error as Error).message ?? "Internal error", data: null };
  })
  // Info API (UI React ada di /)
  .get("/api", () => ({
    success: true,
    message: "🏭 Ultra Sakti Warehouse API — running",
    data: {
      ui: "/",
      docs: "/swagger",
      health: "/api/health",
      endpoints: [
        "/api/dashboard/summary",
        "/api/products",
        "/api/warehouses",
        "/api/suppliers",
        "/api/stocks",
        "/api/inbound",
        "/api/outbound",
        "/api/opname",
      ],
    },
  }))
  .get("/api/health", () => {
    const row = db.query("SELECT datetime('now') AS now").get() as { now: string };
    return { success: true, message: "OK", data: { db: "sqlite", time: row.now } };
  })
  .group("/api", (app) =>
    app
      .use(dashboard)
      .use(products)
      .use(warehouses)
      .use(suppliers)
      .use(stocks)
      .use(inbound)
      .use(outbound)
      .use(opname)
  )
  .listen(Number(process.env.PORT ?? 3000));

console.log(`🏭 Ultra Sakti Warehouse UI  → http://${app.server?.hostname}:${app.server?.port}/`);
console.log(`📚 Swagger docs             → http://${app.server?.hostname}:${app.server?.port}/swagger`);
