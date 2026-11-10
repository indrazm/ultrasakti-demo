import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { swagger } from "@elysiajs/swagger";
import { mcp } from "elysiajs-mcp";
import db from "./db/connection";
import { createSalesMcpServer } from "./mcp/server";
import { distributors } from "./modules/distributors";
import { salesReps } from "./modules/salesReps";
import { customers } from "./modules/customers";
import { products } from "./modules/products";
import { orders } from "./modules/orders";
import { invoices } from "./modules/invoices";
import { payments } from "./modules/payments";
import { dashboard } from "./modules/dashboard";

const app = new Elysia()
  .use(cors())
  // MCP server (Streamable HTTP, stateful session, tanpa auth) → POST/GET/DELETE /mcp
  .use(mcp({ server: () => createSalesMcpServer() }))
  .use(
    swagger({
      path: "/swagger",
      documentation: {
        info: {
          title: "Ultra Sakti Sales API",
          version: "1.0.0",
          description: "Distributor & Sales Management — PT Ultra Sakti (Bun + Elysia + SQLite + React)",
        },
        tags: [
          { name: "General", description: "Health & root" },
          { name: "Dashboard", description: "Revenue, AR, leaderboard" },
          { name: "Distributors", description: "Master distributor" },
          { name: "SalesReps", description: "Tim sales + target" },
          { name: "Customers", description: "Apotek, RS, klinik" },
          { name: "Products", description: "Pricelist" },
          { name: "Orders", description: "Sales order" },
          { name: "Invoices", description: "Invoice + PPN + jatuh tempo" },
          { name: "Payments", description: "Pembayaran invoice" },
        ],
      },
    })
  )
  .onError(({ error, set }) => {
    const status = (error as any)?.status ?? 500;
    set.status = status;
    return { success: false, message: (error as Error).message ?? "Internal error", data: null };
  })
  .get("/", () => Bun.file("./public/index.html"))
  .get("/app.js", () => Bun.file("./public/app.js"))
  .get("/styles.css", () => Bun.file("./public/styles.css"))
  .get("/api", () => ({
    success: true,
    message: "💰 Ultra Sakti Sales API — running",
    data: {
      ui: "/",
      docs: "/swagger",
      health: "/api/health",
      endpoints: [
        "/api/dashboard/summary",
        "/api/distributors",
        "/api/sales-reps",
        "/api/customers",
        "/api/products",
        "/api/orders",
        "/api/invoices",
        "/api/payments",
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
      .use(distributors)
      .use(salesReps)
      .use(customers)
      .use(products)
      .use(orders)
      .use(invoices)
      .use(payments)
  )
  .listen(Number(process.env.PORT ?? 4000));

console.log(`💰 Ultra Sakti Sales UI  → http://${app.server?.hostname}:${app.server?.port}/`);
console.log(`📚 Swagger docs         → http://${app.server?.hostname}:${app.server?.port}/swagger`);
