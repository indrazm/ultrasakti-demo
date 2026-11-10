import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

/* ---------- helpers ---------- */
async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message || "Request failed");
  return json.data as T;
}

const idr = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n ?? 0);

/* ---------- types ---------- */
type Product = { id: string; sku: string; name: string; category: string; unit: string; min_stock: number; price: number; total_stock?: number };
type Warehouse = { id: string; code: string; name: string; address?: string; type: string; total_stock?: number; total_sku?: number };
type Supplier = { id: string; code: string; name: string; contact?: string; phone?: string; email?: string; address?: string };
type StockRow = { id: string; product_id: string; warehouse_id: string; batch_no: string; expired_date?: string; location?: string; qty: number; sku: string; product_name: string; category: string; unit: string; min_stock: number; warehouse_code: string; warehouse_name: string };
type TxnHead = { id: string; trx_no: string; date: string; note?: string; warehouse_name?: string; supplier_name?: string; destination?: string; total_items: number; total_qty: number };
type DashboardData = {
  kpi: { totalProducts: number; totalWarehouses: number; totalSuppliers: number; totalStock: number; inboundCount: number; outboundCount: number; lowStockCount: number };
  lowStock: { sku: string; name: string; min_stock: number; total_stock: number }[];
  expiring: { batch_no: string; expired_date: string; qty: number; sku: string; product_name: string; warehouse_name: string; days_left: number }[];
  recentInbound: TxnHead[]; recentOutbound: TxnHead[];
  stockByCategory: { category: string; total_qty: number; total_sku: number }[];
};

/* ---------- tiny ui ---------- */
const Card = ({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) => (
  <div className="card">
    <div className="card-head"><h3>{title}</h3>{action}</div>
    <div className="card-body">{children}</div>
  </div>
);
const Btn = (p: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button {...p} className={`btn ${p.className ?? ""}`} />
);
const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="field"><span>{label}</span>{children}</label>
);
const inputCls = "input";

/* ================= APP ================= */
const TABS = [
  ["dashboard", "Dashboard"],
  ["products", "Produk"],
  ["warehouses", "Gudang"],
  ["suppliers", "Supplier"],
  ["stocks", "Stok"],
  ["inbound", "Inbound"],
  ["outbound", "Outbound"],
  ["opname", "Opname"],
  ["mcp", "MCP"],
] as const;
type Tab = (typeof TABS)[number][0];
const MAIN_TABS: Tab[] = ["dashboard", "stocks", "inbound", "outbound", "opname", "mcp"];
const MASTER_TABS: Tab[] = ["products", "warehouses", "suppliers"];
const tabLabel = (k: Tab) => TABS.find(([key]) => key === k)?.[1] ?? k;

function App() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [navFilter, setNavFilter] = useState("");
  const today = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  useEffect(() => {
    const goCreate = () => {
      setTab("products");
      setTimeout(() => window.dispatchEvent(new Event("us:open-product-form")), 60);
    };
    window.addEventListener("us:create-product", goCreate);
    return () => window.removeEventListener("us:create-product", goCreate);
  }, []);
  const match = (k: Tab) => tabLabel(k).toLowerCase().includes(navFilter.toLowerCase());
  const navBtn = (k: Tab) => (
    <button key={k} className={tab === k ? "nav active" : "nav"} onClick={() => setTab(k)}>{tabLabel(k)}</button>
  );
  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand"><div className="brand-logo">US</div><div className="brand-text"><b>Ultra Sakti</b><small>Warehouse</small></div><span className="brand-chev">⌄</span></div>
        <div className="side-search"><span>⌕</span><input placeholder="Search" value={navFilter} onChange={(e) => setNavFilter(e.target.value)} /><kbd>/</kbd></div>
        <nav>{MAIN_TABS.filter(match).map(navBtn)}</nav>
        <div className="side-section">
          <span className="side-caption">MASTER DATA</span>
          {MASTER_TABS.filter(match).map((k) => (
            <button key={k} className={tab === k ? "nav active" : "nav"} onClick={() => setTab(k)}><span className="dot" />{tabLabel(k)}</button>
          ))}
        </div>
        <div className="promo">
          <div className="promo-icon">✎</div>
          <b>Butuh integrasi API?</b>
          <p>Hubungkan sistem lain via REST atau MCP.</p>
          <a className="btn block" href="/swagger" target="_blank">API Docs</a>
        </div>
      </aside>
      <div className="content">
        <header className="topbar">
          <div className="topbar-left"><span className="grid-icon">▦</span><b>{tabLabel(tab)}</b></div>
          <div className="topbar-right"><span className="muted">Last update {today}</span></div>
        </header>
        <main className="main">
          {tab === "dashboard" && <Dashboard />}
          {tab === "products" && <Products />}
          {tab === "warehouses" && <Warehouses />}
          {tab === "suppliers" && <Suppliers />}
          {tab === "stocks" && <Stocks />}
          {tab === "inbound" && <Txn mode="inbound" />}
          {tab === "outbound" && <Txn mode="outbound" />}
          {tab === "opname" && <Opname />}
          {tab === "mcp" && <McpSetup />}
        </main>
      </div>
    </div>
  );
}

/* ---------- Dashboard ---------- */
function Dashboard() {
  const [d, setD] = useState<DashboardData | null>(null);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  useEffect(() => { api<DashboardData>("/dashboard/summary").then(setD).catch((e) => setErr(e.message)); }, []);
  if (err) return <p className="error">{err}</p>;
  if (!d) return <p className="muted">Memuat dashboard…</p>;
  const k = d.kpi;
  const kpis: [string, string | number, string][] = [
    ["Total Produk", k.totalProducts, "▤"],
    ["Total Stok (pcs)", k.totalStock.toLocaleString("id-ID"), "✓"],
    ["Gudang Aktif", k.totalWarehouses, "▦"],
    ["Stok Menipis", k.lowStockCount, "◷"],
  ];
  type RecentRow = { trx_no: string; date: string; kind: "IN" | "OUT"; detail: string; total_qty: number };
  const recent: RecentRow[] = [
    ...d.recentInbound.map((r) => ({ trx_no: r.trx_no, date: r.date, kind: "IN" as const, detail: r.supplier_name ?? "-", total_qty: r.total_qty })),
    ...d.recentOutbound.map((r) => ({ trx_no: r.trx_no, date: r.date, kind: "OUT" as const, detail: r.destination ?? "-", total_qty: r.total_qty })),
  ].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 8);
  const shown = recent.filter((r) => `${r.trx_no} ${r.detail}`.toLowerCase().includes(q.toLowerCase()));
  const maxCat = Math.max(1, ...d.stockByCategory.map((c) => c.total_qty));
  const exportCsv = async () => {
    const rows = await api<any[]>("/stocks/summary");
    const head = "sku,name,category,unit,total_stock,min_stock";
    const lines = rows.map((r: any) =>
      [r.sku, `"${String(r.name).replaceAll('"', '""')}"`, r.category, r.unit, r.total_stock, r.min_stock].join(",")
    );
    const blob = new Blob([[head, ...lines].join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "ultra-sakti-stock.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };
  return (
    <div>
      <div className="welcome-row">
        <h2>Warehouse overview</h2>
        <div className="row-gap">
          <button className="btn light" onClick={exportCsv}>⤴ Export</button>
          <button className="btn" onClick={() => window.dispatchEvent(new Event("us:create-product"))}>+ Create</button>
        </div>
      </div>
      <div className="kpis">{kpis.map(([t, v, icon]) => (
        <div key={t} className="kpi"><div><small>{t}</small><b>{v}</b></div><div className="kpi-icon">{icon}</div></div>
      ))}</div>
      <div className="grid2">
        <Card title="Stok per kategori" action={<span className="pill-soft">▦ Semua gudang</span>}>
          <div className="bars">
            {d.stockByCategory.map((c) => (
              <div key={c.category} className="bar-row">
                <span className="bar-label">{c.category} <span className="muted">· {c.total_sku} SKU</span></span>
                <div className="bar-track"><div className="bar-fill" style={{ width: `${Math.max(2, Math.round((c.total_qty / maxCat) * 100))}%` }} /></div>
                <span className="bar-val">{c.total_qty.toLocaleString("id-ID")}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Transaksi terakhir" action={<input className="input pill-search" placeholder="⌕ Search" value={q} onChange={(e) => setQ(e.target.value)} />}>
          <table className="tbl"><thead><tr><th></th><th>No. Transaksi</th><th>Detail</th><th>Tanggal</th><th>Qty</th></tr></thead>
            <tbody>{shown.map((r) => (
              <tr key={r.trx_no}>
                <td><span className={r.kind === "IN" ? "kind in" : "kind out"}>{r.kind}</span></td>
                <td><code>{r.trx_no}</code></td><td>{r.detail}</td><td className="muted">{r.date}</td><td>{r.total_qty}</td>
              </tr>
            ))}</tbody></table>
        </Card>
      </div>
      <div className="grid2">
        <Card title={`Stok menipis (${d.lowStock.length})`}>
          {d.lowStock.length === 0 ? <p className="muted">Semua stok aman.</p> : (
            <table className="tbl"><thead><tr><th>SKU</th><th>Produk</th><th>Stok</th><th>Min</th></tr></thead>
              <tbody>{d.lowStock.map((r) => <tr key={r.sku}><td><code>{r.sku}</code></td><td>{r.name}</td><td className="bad">{r.total_stock}</td><td>{r.min_stock}</td></tr>)}</tbody></table>
          )}
        </Card>
        <Card title="Expired ≤ 90 hari">
          {d.expiring.length === 0 ? <p className="muted">Tidak ada stok mendekati expired.</p> : (
            <table className="tbl"><thead><tr><th>Produk</th><th>Batch</th><th>Exp</th><th>Sisa</th></tr></thead>
              <tbody>{d.expiring.map((r, i) => <tr key={i}><td>{r.product_name}</td><td><code>{r.batch_no}</code></td><td>{r.expired_date}</td><td className="bad">{r.days_left} hari</td></tr>)}</tbody></table>
          )}
        </Card>
      </div>
    </div>
  );
}

/* ---------- Products ---------- */
function Products() {
  const [rows, setRows] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ sku: "", name: "", category: "Obat Bebas", unit: "box", min_stock: 10, price: 0 });
  const load = () => api<{ data: Product[] }>(`/products?limit=200&search=${encodeURIComponent(search)}`).then((r: any) => setRows(r.data ?? r)).catch(() => {});
  useEffect(() => { load(); }, []);
  useEffect(() => {
    const open = () => setShowForm(true);
    window.addEventListener("us:open-product-form", open);
    return () => window.removeEventListener("us:open-product-form", open);
  }, []);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await api("/products", { method: "POST", body: JSON.stringify(form) });
    setForm({ sku: "", name: "", category: "Obat Bebas", unit: "box", min_stock: 10, price: 0 });
    setShowForm(false); load();
  };
  const del = async (id: string) => {
    if (!confirm("Hapus produk ini?")) return;
    await api(`/products/${id}`, { method: "DELETE" }); load();
  };
  return (
    <div>
      <div className="row-between"><h2>Master Produk</h2><Btn onClick={() => setShowForm(!showForm)}>{showForm ? "Tutup" : "＋ Tambah Produk"}</Btn></div>
      {showForm && (
        <Card title="Produk Baru">
          <form onSubmit={submit} className="form-grid">
            <Field label="SKU"><input className={inputCls} value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} required /></Field>
            <Field label="Nama"><input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field>
            <Field label="Kategori"><select className={inputCls} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {["Obat Bebas", "Obat Bebas Terbatas", "Obat Keras", "Suplemen", "Herbal", "Alat Kesehatan"].map((c) => <option key={c}>{c}</option>)}
            </select></Field>
            <Field label="Satuan"><input className={inputCls} value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></Field>
            <Field label="Min. Stok"><input className={inputCls} type="number" value={form.min_stock} onChange={(e) => setForm({ ...form, min_stock: +e.target.value })} /></Field>
            <Field label="Harga (Rp)"><input className={inputCls} type="number" value={form.price} onChange={(e) => setForm({ ...form, price: +e.target.value })} /></Field>
            <div><Btn type="submit">Simpan</Btn></div>
          </form>
        </Card>
      )}
      <Card title="Daftar Produk" action={<input className={inputCls} placeholder="⌕ Cari SKU / nama…" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load()} />}>
        <table className="tbl"><thead><tr><th>SKU</th><th>Nama</th><th>Kategori</th><th>Satuan</th><th>Total Stok</th><th>Harga</th><th></th></tr></thead>
          <tbody>{rows.map((p) => (
            <tr key={p.id}>
              <td><code>{p.sku}</code></td><td>{p.name}</td><td><span className="pill">{p.category}</span></td><td>{p.unit}</td>
              <td className={(p.total_stock ?? 0) <= p.min_stock ? "bad" : "good"}><b>{p.total_stock}</b> <small className="muted">/ min {p.min_stock}</small></td>
              <td>{idr(p.price)}</td>
              <td><button className="link danger" onClick={() => del(p.id)}>hapus</button></td>
            </tr>
          ))}</tbody></table>
      </Card>
    </div>
  );
}

/* ---------- Warehouses ---------- */
function Warehouses() {
  const [rows, setRows] = useState<Warehouse[]>([]);
  const [form, setForm] = useState({ code: "", name: "", address: "", type: "cabang" });
  const load = () => api<Warehouse[]>("/warehouses").then(setRows).catch(() => {});
  useEffect(() => { load(); }, []);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await api("/warehouses", { method: "POST", body: JSON.stringify(form) });
    setForm({ code: "", name: "", address: "", type: "cabang" }); load();
  };
  return (
    <div>
      <h2>Master Gudang</h2>
      <div className="grid2">
        <Card title="＋ Gudang Baru">
          <form onSubmit={submit} className="form-col">
            <Field label="Kode"><input className={inputCls} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required placeholder="GD-…" /></Field>
            <Field label="Nama"><input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field>
            <Field label="Alamat"><input className={inputCls} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
            <Field label="Tipe"><select className={inputCls} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {["pusat", "cabang", "karantina", "retur"].map((t) => <option key={t}>{t}</option>)}
            </select></Field>
            <div><Btn type="submit">Simpan</Btn></div>
          </form>
        </Card>
        <Card title="Daftar Gudang">
          <table className="tbl"><thead><tr><th>Kode</th><th>Nama</th><th>Tipe</th><th>SKU</th><th>Stok</th></tr></thead>
            <tbody>{rows.map((w) => <tr key={w.id}><td><code>{w.code}</code></td><td>{w.name}<br /><small className="muted">{w.address}</small></td><td><span className="pill">{w.type}</span></td><td>{w.total_sku}</td><td>{w.total_stock?.toLocaleString("id-ID")}</td></tr>)}</tbody></table>
        </Card>
      </div>
    </div>
  );
}

/* ---------- Suppliers ---------- */
function Suppliers() {
  const [rows, setRows] = useState<Supplier[]>([]);
  const [form, setForm] = useState({ code: "", name: "", contact: "", phone: "", address: "" });
  const load = () => api<Supplier[]>("/suppliers").then(setRows).catch(() => {});
  useEffect(() => { load(); }, []);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await api("/suppliers", { method: "POST", body: JSON.stringify(form) });
    setForm({ code: "", name: "", contact: "", phone: "", address: "" }); load();
  };
  return (
    <div>
      <h2>Master Supplier</h2>
      <div className="grid2">
        <Card title="＋ Supplier Baru">
          <form onSubmit={submit} className="form-col">
            <Field label="Kode"><input className={inputCls} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required placeholder="SUP-…" /></Field>
            <Field label="Nama"><input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field>
            <Field label="Kontak"><input className={inputCls} value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} /></Field>
            <Field label="Telepon"><input className={inputCls} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
            <Field label="Alamat"><input className={inputCls} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
            <div><Btn type="submit">Simpan</Btn></div>
          </form>
        </Card>
        <Card title="Daftar Supplier">
          <table className="tbl"><thead><tr><th>Kode</th><th>Nama</th><th>Kontak</th></tr></thead>
            <tbody>{rows.map((s) => <tr key={s.id}><td><code>{s.code}</code></td><td>{s.name}<br /><small className="muted">{s.address}</small></td><td>{s.contact}<br /><small className="muted">{s.phone}</small></td></tr>)}</tbody></table>
        </Card>
      </div>
    </div>
  );
}

/* ---------- Stocks ---------- */
function Stocks() {
  const [rows, setRows] = useState<StockRow[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [search, setSearch] = useState("");
  const [wh, setWh] = useState("");
  const [low, setLow] = useState(false);
  const load = () => {
    const p = new URLSearchParams({ search, lowStock: String(low), ...(wh ? { warehouseId: wh } : {}) });
    api<StockRow[]>(`/stocks?${p}`).then(setRows).catch(() => {});
  };
  useEffect(() => { api<Warehouse[]>("/warehouses").then(setWarehouses).catch(() => {}); load(); }, []);
  return (
    <div>
      <h2>Stok Gudang</h2>
      <Card title="Filter" action={<label className="check"><input type="checkbox" checked={low} onChange={(e) => setLow(e.target.checked)} /> hanya stok menipis</label>}>
        <div className="form-grid">
          <input className={inputCls} placeholder="⌕ Cari produk / SKU / batch…" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load()} />
          <select className={inputCls} value={wh} onChange={(e) => setWh(e.target.value)}>
            <option value="">Semua gudang</option>
            {warehouses.map((w) => <option key={w.id} value={w.id}>{w.code} — {w.name}</option>)}
          </select>
          <div><Btn onClick={load}>Terapkan</Btn></div>
        </div>
      </Card>
      <Card title={`Hasil (${rows.length})`}>
        <table className="tbl"><thead><tr><th>Produk</th><th>Gudang</th><th>Batch</th><th>Expired</th><th>Rak</th><th>Qty</th></tr></thead>
          <tbody>{rows.map((s) => (
            <tr key={s.id}>
              <td><code>{s.sku}</code> {s.product_name}</td><td>{s.warehouse_code}</td>
              <td><code>{s.batch_no}</code></td><td>{s.expired_date ?? "-"}</td><td>{s.location}</td>
              <td className={s.qty <= s.min_stock ? "bad" : "good"}><b>{s.qty}</b></td>
            </tr>
          ))}</tbody></table>
      </Card>
    </div>
  );
}

/* ---------- Inbound / Outbound ---------- */
type ItemRow = { product_id: string; batch_no: string; expired_date: string; qty: number; price: number };
const emptyItem: ItemRow = { product_id: "", batch_no: "-", expired_date: "", qty: 1, price: 0 };

function Txn({ mode }: { mode: "inbound" | "outbound" }) {
  const isIn = mode === "inbound";
  const [heads, setHeads] = useState<TxnHead[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [warehouseId, setWarehouseId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [destination, setDestination] = useState("");
  const [note, setNote] = useState("");
  const [items, setItems] = useState<ItemRow[]>([{ ...emptyItem }]);
  const [msg, setMsg] = useState("");

  const load = () => {
    api<{ data: TxnHead[] }>(`/${mode}?limit=20`).then((r: any) => setHeads(r.data ?? r)).catch(() => {});
    api<{ data: Product[] }>(`/products?limit=200`).then((r: any) => setProducts(r.data ?? r)).catch(() => {});
    api<Warehouse[]>("/warehouses").then((w) => { setWarehouses(w); setWarehouseId((v) => v || w[0]?.id || ""); }).catch(() => {});
    if (isIn) api<Supplier[]>("/suppliers").then((s) => { setSuppliers(s); setSupplierId((v) => v || s[0]?.id || ""); }).catch(() => {});
  };
  useEffect(load, []);

  const setItem = (i: number, patch: Partial<ItemRow>) =>
    setItems((arr) => arr.map((it, j) => (j === i ? { ...it, ...patch } : it)));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");
    try {
      const body: any = {
        warehouse_id: warehouseId, note,
        items: items.map((it) => ({
          product_id: it.product_id, batch_no: it.batch_no || "-",
          qty: Number(it.qty),
          ...(isIn ? { expired_date: it.expired_date || undefined, price: Number(it.price) } : {}),
        })),
      };
      if (isIn) body.supplier_id = supplierId || undefined;
      else body.destination = destination;
      const r = await api<{ trx_no: string }>(`/${mode}`, { method: "POST", body: JSON.stringify(body) });
      setMsg(`✅ ${r.trx_no} berhasil disimpan`);
      setItems([{ ...emptyItem }]); setNote(""); setDestination(""); load();
    } catch (e: any) {
      setMsg(`❌ ${e.message}`);
    }
  };

  return (
    <div>
      <h2>{isIn ? "Penerimaan Barang (Inbound)" : "Pengeluaran Barang (Outbound)"}</h2>
      <Card title={isIn ? "＋ Terima Barang" : "＋ Keluarkan Barang"}>
        <form onSubmit={submit} className="form-col">
          <div className="form-grid">
            <Field label="Gudang"><select className={inputCls} value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} required>
              {warehouses.map((w) => <option key={w.id} value={w.id}>{w.code} — {w.name}</option>)}
            </select></Field>
            {isIn ? (
              <Field label="Supplier"><select className={inputCls} value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.code} — {s.name}</option>)}
              </select></Field>
            ) : (
              <Field label="Tujuan"><input className={inputCls} value={destination} onChange={(e) => setDestination(e.target.value)} required placeholder="Cabang / customer / RS…" /></Field>
            )}
            <Field label="Catatan"><input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} placeholder="No. PO / SJ…" /></Field>
          </div>
          {items.map((it, i) => (
            <div key={i} className="item-row">
              <select className={inputCls} value={it.product_id} onChange={(e) => setItem(i, { product_id: e.target.value })} required>
                <option value="">— pilih produk —</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.sku} · {p.name}</option>)}
              </select>
              <input className={inputCls} placeholder="Batch" value={it.batch_no} onChange={(e) => setItem(i, { batch_no: e.target.value })} />
              {isIn && <input className={inputCls} type="date" value={it.expired_date} onChange={(e) => setItem(i, { expired_date: e.target.value })} title="Expired date" />}
              <input className={inputCls} type="number" min={1} value={it.qty} onChange={(e) => setItem(i, { qty: +e.target.value })} title="Qty" />
              {isIn && <input className={inputCls} type="number" min={0} value={it.price} onChange={(e) => setItem(i, { price: +e.target.value })} title="Harga" />}
              <button type="button" className="link danger" onClick={() => setItems((a) => a.filter((_, j) => j !== i))}>✕</button>
            </div>
          ))}
          <div className="row-gap">
            <button type="button" className="btn ghost" onClick={() => setItems((a) => [...a, { ...emptyItem }])}>＋ Baris</button>
            <Btn type="submit">{isIn ? "Simpan Inbound" : "Simpan Outbound"}</Btn>
            {msg && <span>{msg}</span>}
          </div>
        </form>
      </Card>
      <Card title="Riwayat Transaksi">
        <table className="tbl"><thead><tr><th>No. Transaksi</th><th>Tanggal</th><th>{isIn ? "Supplier" : "Tujuan"}</th><th>Item</th><th>Qty</th></tr></thead>
          <tbody>{heads.map((h) => <tr key={h.id}><td><code>{h.trx_no}</code></td><td>{h.date}</td><td>{isIn ? h.supplier_name : h.destination}</td><td>{h.total_items}</td><td>{h.total_qty}</td></tr>)}</tbody></table>
      </Card>
    </div>
  );
}

/* ---------- Opname ---------- */
function Opname() {
  const [rows, setRows] = useState<any[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [form, setForm] = useState({ product_id: "", warehouse_id: "", batch_no: "-", physical_qty: 0, reason: "" });
  const [msg, setMsg] = useState("");
  useEffect(() => {
    api<any[]>("/opname").then(setRows).catch(() => {});
    api<{ data: Product[] }>(`/products?limit=200`).then((r: any) => setProducts(r.data ?? r)).catch(() => {});
    api<Warehouse[]>("/warehouses").then(setWarehouses).catch(() => {});
  }, []);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");
    try {
      const r = await api<{ diff: number }>("/opname", { method: "POST", body: JSON.stringify({ ...form, physical_qty: Number(form.physical_qty) }) });
      setMsg(`✅ Opname disimpan (selisih: ${r.diff})`);
      api<any[]>("/opname").then(setRows).catch(() => {});
    } catch (e: any) { setMsg(`❌ ${e.message}`); }
  };
  return (
    <div>
      <h2>Stock Opname</h2>
      <Card title="＋ Opname Baru">
        <form onSubmit={submit} className="form-grid">
          <Field label="Produk"><select className={inputCls} value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value })} required>
            <option value="">— pilih —</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.sku} · {p.name}</option>)}
          </select></Field>
          <Field label="Gudang"><select className={inputCls} value={form.warehouse_id} onChange={(e) => setForm({ ...form, warehouse_id: e.target.value })} required>
            <option value="">— pilih —</option>
            {warehouses.map((w) => <option key={w.id} value={w.id}>{w.code} — {w.name}</option>)}
          </select></Field>
          <Field label="Batch"><input className={inputCls} value={form.batch_no} onChange={(e) => setForm({ ...form, batch_no: e.target.value })} /></Field>
          <Field label="Qty Fisik"><input className={inputCls} type="number" min={0} value={form.physical_qty} onChange={(e) => setForm({ ...form, physical_qty: +e.target.value })} required /></Field>
          <Field label="Alasan"><input className={inputCls} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Rusak / hilang / salah hitung…" /></Field>
          <div><Btn type="submit">Simpan</Btn> {msg && <span> {msg}</span>}</div>
        </form>
      </Card>
      <Card title="Riwayat Opname">
        <table className="tbl"><thead><tr><th>Tanggal</th><th>Produk</th><th>Gudang</th><th>Sistem</th><th>Fisik</th><th>Selisih</th><th>Alasan</th></tr></thead>
          <tbody>{rows.map((r) => <tr key={r.id}><td>{r.date}</td><td>{r.product_name}</td><td>{r.warehouse_name}</td><td>{r.system_qty}</td><td>{r.physical_qty}</td><td className={r.diff === 0 ? "good" : "bad"}><b>{r.diff > 0 ? `+${r.diff}` : r.diff}</b></td><td>{r.reason}</td></tr>)}</tbody></table>
      </Card>
    </div>
  );
}

/* ---------- MCP Setup ---------- */
function McpSetup() {
  const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  const tools: [string, string][] = [
    ["dashboard_summary", "KPI + stok menipis + expiring ≤90 hari"],
    ["list_products", "Cari/daftar produk + total stok"],
    ["get_product", "Detail produk + sebaran stok per gudang"],
    ["create_product", "Tambah produk baru"],
    ["list_warehouses", "Daftar gudang + total stok"],
    ["list_suppliers", "Daftar supplier"],
    ["check_stock", "Cek stok per batch (filter + low-stock)"],
    ["expiring_stock", "Stok expired / mendekati expired"],
    ["create_inbound", "Penerimaan barang (stok +)"],
    ["create_outbound", "Pengeluaran barang (stok −, guard minus)"],
    ["record_opname", "Stock opname (sesuaikan ke qty fisik)"],
  ];
  return (
    <div>
      <h2>MCP — AI Agent Access</h2>
      <Card title="Endpoint">
        <p>Kontrol gudang ini dari AI agent (Claude, Inspector, dsb.) via <b>Model Context Protocol — Streamable HTTP</b>. Tanpa auth.</p>
        <pre className="code">{`${origin}/mcp`}</pre>
        <p className="muted">Mode: <b>stateful session</b> — client wajib handshake <code>initialize</code> → ambil header <code>mcp-session-id</code> → pakai di semua request berikutnya.</p>
      </Card>
      <div className="grid2">
        <Card title="Coba via MCP Inspector">
          <pre className="code">npx @modelcontextprotocol/inspector</pre>
          <p className="muted">Buka URL Inspector → Transport <b>Streamable HTTP</b> → URL <b>{`${origin}/mcp`}</b> → Connect → tab Tools untuk panggil 11 tools di samping.</p>
        </Card>
        <Card title="Claude Desktop (via mcp-remote)">
          <pre className="code">{`{
  "mcpServers": {
    "ultra-sakti": {
      "command": "npx",
      "args": ["mcp-remote", "${origin}/mcp"]
    }
  }
}`}</pre>
        </Card>
      </div>
      <Card title="11 Tools Tersedia">
        <table className="tbl"><thead><tr><th>Tool</th><th>Fungsi</th></tr></thead>
          <tbody>{tools.map(([t, d]) => <tr key={t}><td><code>{t}</code></td><td>{d}</td></tr>)}</tbody></table>
      </Card>
      <Card title="Contoh via curl">
        <pre className="code">{`# 1. initialize → catat header mcp-session-id
SID=$(curl -s -D - -o /dev/null -X POST ${origin}/mcp \\
  -H 'Content-Type: application/json' \\
  -H 'Accept: application/json, text/event-stream' \\
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":
    {"protocolVersion":"2025-06-18","capabilities":{},
     "clientInfo":{"name":"demo","version":"1.0"}}}' \\
  | grep -i '^mcp-session-id' | awk '{print $2}' | tr -d '\\r')

# 2. panggil tool (contoh: cek stok menipis)
curl -X POST ${origin}/mcp \\
  -H 'Content-Type: application/json' \\
  -H 'Accept: application/json, text/event-stream' \\
  -H "Mcp-Session-Id: $SID" \\
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call",
    "params":{"name":"check_stock",
      "arguments":{"low_stock_only":true,"limit":5}}}'`}</pre>
      </Card>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
