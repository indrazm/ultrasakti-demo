export const SCHEMA_SQL = /* sql */ `
CREATE TABLE IF NOT EXISTS distributors (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  region TEXT NOT NULL,
  address TEXT,
  contact TEXT,
  phone TEXT,
  type TEXT NOT NULL DEFAULT 'sub',
  credit_limit REAL NOT NULL DEFAULT 500000000,
  top_days INTEGER NOT NULL DEFAULT 30,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sales_reps (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  area TEXT NOT NULL,
  phone TEXT,
  monthly_target REAL NOT NULL DEFAULT 200000000,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'apotek',
  city TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  credit_limit REAL NOT NULL DEFAULT 100000000,
  top_days INTEGER NOT NULL DEFAULT 30,
  distributor_id TEXT REFERENCES distributors(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_customers_type ON customers(type);
CREATE INDEX IF NOT EXISTS idx_customers_city ON customers(city);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  sku TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Obat Bebas',
  unit TEXT NOT NULL DEFAULT 'box',
  price REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  so_no TEXT UNIQUE NOT NULL,
  customer_id TEXT NOT NULL REFERENCES customers(id),
  sales_rep_id TEXT NOT NULL REFERENCES sales_reps(id),
  distributor_id TEXT REFERENCES distributors(id),
  date TEXT NOT NULL DEFAULT (date('now')),
  status TEXT NOT NULL DEFAULT 'draft',
  subtotal REAL NOT NULL DEFAULT 0,
  discount_total REAL NOT NULL DEFAULT 0,
  grand_total REAL NOT NULL DEFAULT 0,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_date ON orders(date);

CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id),
  qty INTEGER NOT NULL,
  price REAL NOT NULL DEFAULT 0,
  discount REAL NOT NULL DEFAULT 0,
  line_total REAL NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  inv_no TEXT UNIQUE NOT NULL,
  order_id TEXT UNIQUE NOT NULL REFERENCES orders(id),
  customer_id TEXT NOT NULL REFERENCES customers(id),
  date TEXT NOT NULL DEFAULT (date('now')),
  due_date TEXT NOT NULL,
  subtotal REAL NOT NULL DEFAULT 0,
  ppn REAL NOT NULL DEFAULT 0,
  grand_total REAL NOT NULL DEFAULT 0,
  paid_total REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'unpaid',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

CREATE TABLE IF NOT EXISTS invoice_items (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id),
  qty INTEGER NOT NULL,
  price REAL NOT NULL DEFAULT 0,
  discount REAL NOT NULL DEFAULT 0,
  line_total REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  pay_no TEXT UNIQUE NOT NULL,
  invoice_id TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  date TEXT NOT NULL DEFAULT (date('now')),
  amount REAL NOT NULL,
  method TEXT NOT NULL DEFAULT 'transfer',
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
`;
