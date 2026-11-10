export const SCHEMA_SQL = /* sql */ `
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  sku TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Obat Bebas',
  unit TEXT NOT NULL DEFAULT 'box',
  min_stock INTEGER NOT NULL DEFAULT 10,
  price REAL NOT NULL DEFAULT 0,
  description TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

CREATE TABLE IF NOT EXISTS warehouses (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  type TEXT NOT NULL DEFAULT 'pusat',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  contact TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS stocks (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  warehouse_id TEXT NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  batch_no TEXT NOT NULL DEFAULT '-',
  expired_date TEXT,
  location TEXT DEFAULT 'A-01',
  qty INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(product_id, warehouse_id, batch_no)
);
CREATE INDEX IF NOT EXISTS idx_stocks_product ON stocks(product_id);
CREATE INDEX IF NOT EXISTS idx_stocks_warehouse ON stocks(warehouse_id);

CREATE TABLE IF NOT EXISTS inbound_headers (
  id TEXT PRIMARY KEY,
  trx_no TEXT UNIQUE NOT NULL,
  warehouse_id TEXT NOT NULL REFERENCES warehouses(id),
  supplier_id TEXT REFERENCES suppliers(id),
  date TEXT NOT NULL DEFAULT (date('now')),
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS inbound_items (
  id TEXT PRIMARY KEY,
  inbound_id TEXT NOT NULL REFERENCES inbound_headers(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id),
  batch_no TEXT NOT NULL DEFAULT '-',
  expired_date TEXT,
  qty INTEGER NOT NULL,
  price REAL NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_inbound_items_inbound ON inbound_items(inbound_id);

CREATE TABLE IF NOT EXISTS outbound_headers (
  id TEXT PRIMARY KEY,
  trx_no TEXT UNIQUE NOT NULL,
  warehouse_id TEXT NOT NULL REFERENCES warehouses(id),
  destination TEXT NOT NULL,
  date TEXT NOT NULL DEFAULT (date('now')),
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS outbound_items (
  id TEXT PRIMARY KEY,
  outbound_id TEXT NOT NULL REFERENCES outbound_headers(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id),
  batch_no TEXT NOT NULL DEFAULT '-',
  qty INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_outbound_items_outbound ON outbound_items(outbound_id);

CREATE TABLE IF NOT EXISTS opnames (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id),
  warehouse_id TEXT NOT NULL REFERENCES warehouses(id),
  batch_no TEXT NOT NULL DEFAULT '-',
  system_qty INTEGER NOT NULL,
  physical_qty INTEGER NOT NULL,
  diff INTEGER NOT NULL,
  reason TEXT,
  date TEXT NOT NULL DEFAULT (date('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;
