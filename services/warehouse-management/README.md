# 🏭 Ultra Sakti Warehouse — Mock WMS

Mock Warehouse Management System untuk **PT Ultra Sakti** (Farmasi).
**Bun + Elysia + SQLite (`bun:sqlite`) + React UI** (diserve langsung oleh Elysia, tanpa server terpisah).

## Quick Start

```bash
bun install
bun run db:reset   # buat + seed database contoh farmasi
bun run dev        # build UI + jalan di http://localhost:3000
```

| URL | Fungsi |
|---|---|
| http://localhost:3000/ | 🖥️ React UI (Dashboard … Opname, 🔌 MCP setup) |
| http://localhost:3000/mcp | 🔌 MCP endpoint (Streamable HTTP, 11 tools, tanpa auth) |
| http://localhost:3000/swagger | 📚 API docs (Swagger) |
| http://localhost:3000/api/health | 💚 Health check |

## Fitur Mock

| Modul | Endpoint | UI |
|---|---|---|
| Dashboard | `GET /api/dashboard/summary` | KPI, stok menipis, expiring ≤90 hari, transaksi terakhir |
| Products | `/api/products` | CRUD obat / alkes + search |
| Warehouses | `/api/warehouses` | CRUD gudang |
| Suppliers | `/api/suppliers` | CRUD supplier |
| Stocks | `/api/stocks` | Stok per batch, filter gudang, low-stock, expiring |
| Inbound | `/api/inbound` | Form penerimaan multi-item (stok + otomatis) |
| Outbound | `/api/outbound` | Form pengeluaran, cegah stok minus |
| Stock Opname | `/api/opname` | Penyesuaian fisik vs sistem |

## Struktur

```
src/
  index.ts            # Elysia app: serve React bundle + /api/* + swagger
  db/
    connection.ts     # bun:sqlite singleton + auto-migrate DDL
    schema.sql.ts     # DDL tables
    seed.ts           # seed besar: 120 produk, 10 gudang, 15 supplier + riwayat
  modules/            # products, warehouses, suppliers, stocks,
                      # inbound, outbound, opname, dashboard
  lib/                # response envelope + id generator
client/
  app.tsx             # React SPA (8 tab)
  build.ts            # Bun.build → public/app.js
public/
  index.html / styles.css / app.js   # diserve Elysia di /, /app.js, /styles.css
```

## Contoh Flow (via UI)

1. Tab **Produk** → tambah obat baru
2. Tab **Inbound** → terima barang dari supplier (stok +)
3. Tab **Stok** → centang "hanya stok menipis"
4. Tab **Outbound** → keluarkan ke cabang/customer (stok −, minus ditolak)
5. Tab **Opname** → sesuaikan hasil stock opname

## Docker

```bash
docker compose up --build   # → http://localhost:3000/ (DB tersimpan di volume)
```

## Scripts

```bash
bun run dev        # build UI + watch server
bun run start      # build UI + run server
bun run build:ui   # build React saja (wajib sebelum start manual)
bun run seed       # seed (skip jika sudah ada data)
bun run db:reset   # hapus DB + seed ulang
```

> ⚠️ Catatan Bun versi ini: named parameter SQLite wajib pakai prefix `$`
> (contoh: `WHERE id = $id` + `.get({ $id })`).
