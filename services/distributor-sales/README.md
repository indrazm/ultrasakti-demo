# 💰 Ultra Sakti Sales — Distributor & Sales Management

Mock Distributor & Sales Management untuk **PT Ultra Sakti** (Farmasi).
**Bun + Elysia + SQLite (`bun:sqlite`) + React UI + MCP** (diserve langsung oleh Elysia).

## Quick Start

```bash
bun install
bun run db:reset   # buat + seed database penjualan
bun run dev        # build UI + jalan di http://localhost:4000
```

| URL | Fungsi |
|---|---|
| http://localhost:4000/ | 🖥️ React UI (Dashboard, Orders, Invoices, Payments, … + MCP setup) |
| http://localhost:4000/swagger | 📚 API docs |
| http://localhost:4000/mcp | 🔌 MCP endpoint (Streamable HTTP, 11 tools, tanpa auth) |
| http://localhost:4000/api/health | 💚 Health check |

## Fitur

| Modul | Endpoint | Deskripsi |
|---|---|---|
| Dashboard | `GET /api/dashboard/summary` | Revenue, AR outstanding, overdue, aging, leaderboard, achievement vs target |
| Distributors | `/api/distributors` | CRUD distributor + revenue per distributor |
| Sales Team | `/api/sales-reps` | CRUD sales + target bulanan |
| Customers | `/api/customers` | Apotek / RS / klinik / puskesmas / toko obat + outstanding |
| Products | `/api/products` | Pricelist |
| Orders | `/api/orders` | SO multi-item, total otomatis, flow draft→confirmed→shipped→invoiced |
| Invoices | `/api/invoices` | Invoice dari order shipped, PPN 11%, jatuh tempo = TOP customer |
| Payments | `/api/payments` | Parsial boleh, tolak overpayment, status paid/partial/overdue otomatis |

## Alur

1. **Orders** → buat SO (draft) → majukan ke confirmed → shipped
2. **Invoices** → buat invoice dari order shipped (PPN + due date otomatis)
3. **Payments** → catat pembayaran (parsial OK) → status invoice terupdate
4. **Dashboard** → pantau revenue, AR aging, overdue, leaderboard sales

## Docker

```bash
docker compose up --build   # → http://localhost:4000/
```

## Scripts

```bash
bun run dev        # build UI + watch server
bun run start      # build UI + run server
bun run build:ui   # build React saja
bun run seed       # seed (skip jika sudah ada data)
bun run db:reset   # hapus DB + seed ulang
```

> ⚠️ Named parameter SQLite wajib pakai prefix `$` di Bun versi ini.
