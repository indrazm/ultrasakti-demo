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

const idr = (n: number) => `Rp${Math.round(n ?? 0).toLocaleString("id-ID")}`;
const idrShort = (n: number) =>
  n >= 1e9 ? `Rp${(n / 1e9).toLocaleString("id-ID", { maximumFractionDigits: 1 })} M` : `Rp${Math.round(n / 1e6)} jt`;

/* ---------- types ---------- */
type Distributor = { id: string; code: string; name: string; region: string; type: string; credit_limit: number; top_days: number; total_customers?: number; total_revenue?: number };
type Rep = { id: string; code: string; name: string; area: string; phone?: string; monthly_target: number; total_orders?: number; total_revenue?: number };
type Customer = { id: string; code: string; name: string; type: string; city: string; phone?: string; credit_limit: number; top_days: number; distributor_id?: string; total_orders?: number; total_revenue?: number; outstanding?: number };
type Product = { id: string; sku: string; name: string; category: string; unit: string; price: number };
type OrderHead = { id: string; so_no: string; date: string; status: string; grand_total: number; customer_name?: string; sales_name?: string; distributor_name?: string; total_items: number };
type InvoiceHead = { id: string; inv_no: string; date: string; due_date: string; status: string; grand_total: number; paid_total: number; outstanding: number; customer_name?: string; days_overdue?: number };
type DashboardData = {
  kpi: { revenue: number; invoiced: number; collected: number; outstanding: number; overdue: number; orderCount: number; customerCount: number; monthRevenue: number; monthTarget: number; achievement: number };
  byStatus: { status: string; count: number; total: number }[];
  topProducts: { sku: string; name: string; qty: number; revenue: number }[];
  topCustomers: { code: string; name: string; city: string; orders: number; revenue: number }[];
  leaderboard: { code: string; name: string; area: string; monthly_target: number; orders: number; revenue: number; month_revenue: number; achievement: number }[];
  aging: { current: number; d1_30: number; d31_60: number; d60: number };
  recentOrders: { so_no: string; date: string; status: string; grand_total: number; customer_name: string; sales_name: string }[];
  overdueInvoices: { inv_no: string; due_date: string; outstanding: number; customer_name: string; days_overdue: number }[];
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
const St = ({ s }: { s: string }) => <span className={`st ${s}`}>{s}</span>;

/* ================= APP ================= */
const TABS = [
  ["dashboard", "Dashboard"],
  ["orders", "Orders"],
  ["invoices", "Invoices"],
  ["payments", "Payments"],
  ["customers", "Customers"],
  ["distributors", "Distributors"],
  ["reps", "Sales Team"],
  ["products", "Products"],
  ["mcp", "MCP"],
] as const;
type Tab = (typeof TABS)[number][0];
const MAIN_TABS: Tab[] = ["dashboard", "orders", "invoices", "payments", "mcp"];
const MASTER_TABS: Tab[] = ["customers", "distributors", "reps", "products"];
const tabLabel = (k: Tab) => TABS.find(([key]) => key === k)?.[1] ?? k;

function App() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [navFilter, setNavFilter] = useState("");
  const today = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  useEffect(() => {
    const goCreate = () => {
      setTab("orders");
      setTimeout(() => window.dispatchEvent(new Event("us:open-order-form")), 60);
    };
    window.addEventListener("us:create-order", goCreate);
    return () => window.removeEventListener("us:create-order", goCreate);
  }, []);
  const match = (k: Tab) => tabLabel(k).toLowerCase().includes(navFilter.toLowerCase());
  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand"><div className="brand-logo">US</div><div className="brand-text"><b>Ultra Sakti</b><small>Sales & Distribution</small></div><span className="brand-chev">⌄</span></div>
        <div className="side-search"><span>⌕</span><input placeholder="Search" value={navFilter} onChange={(e) => setNavFilter(e.target.value)} /><kbd>/</kbd></div>
        <nav>{MAIN_TABS.filter(match).map((k) => (
          <button key={k} className={tab === k ? "nav active" : "nav"} onClick={() => setTab(k)}>{tabLabel(k)}</button>
        ))}</nav>
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
          {tab === "orders" && <Orders />}
          {tab === "invoices" && <Invoices />}
          {tab === "payments" && <Payments />}
          {tab === "customers" && <Customers />}
          {tab === "distributors" && <Distributors />}
          {tab === "reps" && <Reps />}
          {tab === "products" && <Products />}
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
  useEffect(() => { api<DashboardData>("/dashboard/summary").then(setD).catch((e) => setErr(e.message)); }, []);
  if (err) return <p className="error">{err}</p>;
  if (!d) return <p className="muted">Memuat dashboard…</p>;
  const k = d.kpi;
  const kpis: [string, string, string][] = [
    ["Revenue (valid)", idrShort(k.revenue), "◈"],
    ["Outstanding AR", idrShort(k.outstanding), "◷"],
    ["Overdue", idrShort(k.overdue), "!"],
    [`Target bln ini (${k.achievement}%)`, `${idrShort(k.monthRevenue)} / ${idrShort(k.monthTarget)}`, "◎"],
  ];
  const maxP = Math.max(1, ...d.topProducts.map((p) => p.revenue));
  const ages: [string, number][] = [
    ["Belum jatuh tempo", d.aging.current ?? 0],
    ["Terlambat 1–30 hari", d.aging.d1_30 ?? 0],
    ["Terlambat 31–60 hari", d.aging.d31_60 ?? 0],
    ["Terlambat > 60 hari", d.aging.d60 ?? 0],
  ];
  const maxA = Math.max(1, ...ages.map(([, v]) => v));
  return (
    <div>
      <div className="welcome-row">
        <h2>Sales overview</h2>
        <div className="row-gap">
          <button className="btn" onClick={() => window.dispatchEvent(new Event("us:create-order"))}>+ Create Order</button>
        </div>
      </div>
      <div className="kpis">{kpis.map(([t, v, icon]) => (
        <div key={t} className="kpi"><div><small>{t}</small><b>{v}</b></div><div className="kpi-icon">{icon}</div></div>
      ))}</div>
      <div className="grid2">
        <Card title="Leaderboard sales" action={<span className="pill-soft">Bulan berjalan</span>}>
          <table className="tbl"><thead><tr><th>Sales</th><th>Order</th><th>Revenue bln ini</th><th>Target</th><th>Achv.</th></tr></thead>
            <tbody>{d.leaderboard.slice(0, 7).map((r) => (
              <tr key={r.code}><td>{r.name}<br /><small className="muted">{r.area}</small></td><td className="num">{r.orders}</td>
                <td className="num">{idrShort(r.month_revenue)}</td><td className="num muted">{idrShort(r.monthly_target)}</td>
                <td className={r.achievement >= 100 ? "good" : r.achievement >= 50 ? "" : "bad"}><b>{r.achievement}%</b></td></tr>
            ))}</tbody></table>
        </Card>
        <Card title="Produk terlaris" action={<span className="pill-soft">By revenue</span>}>
          <div className="bars">
            {d.topProducts.map((p) => (
              <div key={p.sku} className="bar-row">
                <span className="bar-label"><code>{p.sku}</code> {p.name.slice(0, 26)}</span>
                <div className="bar-track"><div className="bar-fill" style={{ width: `${Math.max(2, Math.round((p.revenue / maxP) * 100))}%` }} /></div>
                <span className="bar-val">{idrShort(p.revenue)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <div className="grid2">
        <Card title="Aging piutang (AR)">
          <div className="bars">
            {ages.map(([t, v]) => (
              <div key={t} className="bar-row">
                <span className="bar-label">{t}</span>
                <div className="bar-track"><div className="bar-fill" style={{ width: `${Math.max(2, Math.round((v / maxA) * 100))}%` }} /></div>
                <span className="bar-val">{idrShort(v)}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card title={`Invoice overdue (${d.overdueInvoices.length})`}>
          {d.overdueInvoices.length === 0 ? <p className="muted">Tidak ada invoice overdue.</p> : (
            <table className="tbl"><thead><tr><th>Invoice</th><th>Customer</th><th>Outstanding</th><th>Telat</th></tr></thead>
              <tbody>{d.overdueInvoices.map((r) => (
                <tr key={r.inv_no}><td><code>{r.inv_no}</code></td><td>{r.customer_name.slice(0, 28)}</td>
                  <td className="bad num">{idr(r.outstanding)}</td><td>{r.days_overdue} hari</td></tr>
              ))}</tbody></table>
          )}
        </Card>
      </div>
      <Card title="Order terakhir">
        <table className="tbl"><thead><tr><th>No. SO</th><th>Tanggal</th><th>Customer</th><th>Sales</th><th>Status</th><th>Total</th></tr></thead>
          <tbody>{d.recentOrders.map((r) => (
            <tr key={r.so_no}><td><code>{r.so_no}</code></td><td className="muted">{r.date}</td><td>{r.customer_name.slice(0, 30)}</td>
              <td>{r.sales_name}</td><td><St s={r.status} /></td><td className="num">{idr(r.grand_total)}</td></tr>
          ))}</tbody></table>
      </Card>
    </div>
  );
}

/* ---------- Orders ---------- */
type OrderItemRow = { product_id: string; qty: number; discount: number };
function Orders() {
  const [rows, setRows] = useState<OrderHead[]>([]);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [reps, setReps] = useState<Rep[]>([]);
  const [dists, setDists] = useState<Distributor[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ customer_id: "", sales_rep_id: "", distributor_id: "", note: "" });
  const [items, setItems] = useState<OrderItemRow[]>([{ product_id: "", qty: 10, discount: 0 }]);
  const [msg, setMsg] = useState("");

  const load = () => {
    const p = new URLSearchParams({ limit: "30", ...(status ? { status } : {}), ...(search ? { search } : {}) });
    api<{ data: OrderHead[] }>(`/orders?${p}`).then((r: any) => setRows(r.data ?? r)).catch(() => {});
  };
  useEffect(() => {
    load();
    api<{ data: Product[] }>(`/products?limit=200`).then((r: any) => setProducts(r.data ?? r)).catch(() => {});
    api<{ data: Customer[] }>(`/customers?limit=100`).then((r: any) => setCustomers(r.data ?? r)).catch(() => {});
    api<Rep[]>("/sales-reps").then(setReps).catch(() => {});
    api<Distributor[]>("/distributors").then(setDists).catch(() => {});
    const open = () => setShowForm(true);
    window.addEventListener("us:open-order-form", open);
    return () => window.removeEventListener("us:open-order-form", open);
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");
    try {
      const r = await api<{ so_no: string; grand_total: number }>("/orders", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          distributor_id: form.distributor_id || undefined,
          items: items.map((it) => ({ product_id: it.product_id, qty: Number(it.qty), discount: Number(it.discount) })),
        }),
      });
      setMsg(`✅ ${r.so_no} tersimpan (${idr(r.grand_total)})`);
      setItems([{ product_id: "", qty: 10, discount: 0 }]); load();
    } catch (e: any) { setMsg(`❌ ${e.message}`); }
  };

  const setStatusRow = async (id: string, s: string) => {
    try {
      await api(`/orders/${id}/status`, { method: "PATCH", body: JSON.stringify({ status: s }) });
      load();
    } catch (e: any) { alert(e.message); }
  };

  const nextActions: Record<string, string[]> = {
    draft: ["confirmed", "cancelled"], confirmed: ["shipped", "cancelled"],
    shipped: [], invoiced: [], cancelled: [],
  };

  return (
    <div>
      <div className="row-between"><h2>Sales Orders</h2><Btn onClick={() => setShowForm(!showForm)}>{showForm ? "Tutup" : "+ Buat Order"}</Btn></div>
      {showForm && (
        <Card title="Order Baru">
          <form onSubmit={submit} className="form-col">
            <div className="form-grid">
              <Field label="Customer"><select className={inputCls} value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })} required>
                <option value="">— pilih —</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.code} · {c.name}</option>)}
              </select></Field>
              <Field label="Sales"><select className={inputCls} value={form.sales_rep_id} onChange={(e) => setForm({ ...form, sales_rep_id: e.target.value })} required>
                <option value="">— pilih —</option>
                {reps.map((r) => <option key={r.id} value={r.id}>{r.name} ({r.area})</option>)}
              </select></Field>
              <Field label="Distributor (opsional)"><select className={inputCls} value={form.distributor_id} onChange={(e) => setForm({ ...form, distributor_id: e.target.value })}>
                <option value="">—</option>
                {dists.map((d) => <option key={d.id} value={d.id}>{d.code} — {d.name}</option>)}
              </select></Field>
              <Field label="Catatan"><input className={inputCls} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></Field>
            </div>
            {items.map((it, i) => (
              <div key={i} className="item-row">
                <select className={inputCls} value={it.product_id} onChange={(e) => setItems((a) => a.map((x, j) => j === i ? { ...x, product_id: e.target.value } : x))} required>
                  <option value="">— pilih produk —</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.sku} · {p.name} ({idr(p.price)})</option>)}
                </select>
                <input className={inputCls} type="number" min={1} value={it.qty} title="Qty" onChange={(e) => setItems((a) => a.map((x, j) => j === i ? { ...x, qty: +e.target.value } : x))} />
                <input className={inputCls} type="number" min={0} max={100} value={it.discount} title="Disc %" onChange={(e) => setItems((a) => a.map((x, j) => j === i ? { ...x, discount: +e.target.value } : x))} />
                <button type="button" className="link danger" onClick={() => setItems((a) => a.filter((_, j) => j !== i))}>✕</button>
              </div>
            ))}
            <div className="row-gap">
              <button type="button" className="btn ghost" onClick={() => setItems((a) => [...a, { product_id: "", qty: 10, discount: 0 }])}>+ Baris</button>
              <Btn type="submit">Simpan Order</Btn>
              {msg && <span>{msg}</span>}
            </div>
          </form>
        </Card>
      )}
      <Card title={`Daftar Order (${rows.length})`} action={
        <div className="row-gap">
          <select className={inputCls} style={{ width: 150 }} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Semua status</option>
            {["draft", "confirmed", "shipped", "invoiced", "cancelled"].map((s) => <option key={s}>{s}</option>)}
          </select>
          <input className={`${inputCls} pill-search`} placeholder="⌕ SO / customer…" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load()} />
          <Btn onClick={load}>Terapkan</Btn>
        </div>
      }>
        <table className="tbl"><thead><tr><th>No. SO</th><th>Tanggal</th><th>Customer</th><th>Sales</th><th>Status</th><th>Total</th><th></th></tr></thead>
          <tbody>{rows.map((o) => (
            <tr key={o.id}>
              <td><code>{o.so_no}</code><br /><small className="muted">{o.total_items} item</small></td>
              <td className="muted">{o.date}</td><td>{o.customer_name}</td><td>{o.sales_name}</td>
              <td><St s={o.status} /></td><td className="num">{idr(o.grand_total)}</td>
              <td>{(nextActions[o.status] ?? []).map((s) => (
                <button key={s} className="link" style={{ marginRight: 8 }} onClick={() => setStatusRow(o.id, s)}>→ {s}</button>
              ))}
                {o.status === "shipped" && <small className="muted">buat invoice di tab Invoices</small>}</td>
            </tr>
          ))}</tbody></table>
      </Card>
    </div>
  );
}

/* ---------- Invoices ---------- */
function Invoices() {
  const [rows, setRows] = useState<InvoiceHead[]>([]);
  const [status, setStatus] = useState("");
  const [shipped, setShipped] = useState<OrderHead[]>([]);
  const [orderId, setOrderId] = useState("");
  const [msg, setMsg] = useState("");
  const load = () => {
    const p = new URLSearchParams({ limit: "30", ...(status ? { status } : {}) });
    api<{ data: InvoiceHead[] }>(`/invoices?${p}`).then((r: any) => setRows(r.data ?? r)).catch(() => {});
    api<{ data: OrderHead[] }>(`/orders?status=shipped&limit=50`).then((r: any) => setShipped(r.data ?? r)).catch(() => {});
  };
  useEffect(load, []);
  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");
    try {
      const r = await api<{ inv_no: string; grand_total: number }>("/invoices", {
        method: "POST", body: JSON.stringify({ order_id: orderId }),
      });
      setMsg(`✅ ${r.inv_no} (${idr(r.grand_total)})`);
      setOrderId(""); load();
    } catch (e: any) { setMsg(`❌ ${e.message}`); }
  };
  return (
    <div>
      <h2>Invoices</h2>
      <Card title="Buat Invoice dari Order Shipped (PPN 11%)">
        <form onSubmit={create} className="row-gap">
          <select className={inputCls} style={{ minWidth: 320 }} value={orderId} onChange={(e) => setOrderId(e.target.value)} required>
            <option value="">— pilih order shipped —</option>
            {shipped.map((o) => <option key={o.id} value={o.id}>{o.so_no} · {o.customer_name} ({idr(o.grand_total)})</option>)}
          </select>
          <Btn type="submit">Buat Invoice</Btn>
          {msg && <span>{msg}</span>}
        </form>
      </Card>
      <Card title={`Daftar Invoice (${rows.length})`} action={
        <div className="row-gap">
          <select className={inputCls} style={{ width: 150 }} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Semua status</option>
            {["unpaid", "partial", "paid", "overdue"].map((s) => <option key={s}>{s}</option>)}
          </select>
          <Btn onClick={load}>Terapkan</Btn>
        </div>
      }>
        <table className="tbl"><thead><tr><th>Invoice</th><th>Jatuh Tempo</th><th>Customer</th><th>Status</th><th>Total</th><th>Dibayar</th><th>Sisa</th></tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r.id}>
              <td><code>{r.inv_no}</code></td><td className="muted">{r.due_date}{r.days_overdue != null && r.days_overdue > 0 ? ` (${r.days_overdue}h)` : ""}</td>
              <td>{r.customer_name}</td><td><St s={r.status} /></td>
              <td className="num">{idr(r.grand_total)}</td><td className="num good">{idr(r.paid_total)}</td>
              <td className="num bad">{idr(r.outstanding)}</td>
            </tr>
          ))}</tbody></table>
      </Card>
    </div>
  );
}

/* ---------- Payments ---------- */
function Payments() {
  const [rows, setRows] = useState<any[]>([]);
  const [open, setOpen] = useState<InvoiceHead[]>([]);
  const [form, setForm] = useState({ invoice_id: "", amount: 0, method: "transfer", note: "" });
  const [msg, setMsg] = useState("");
  const load = () => {
    api<any[]>("/payments").then(setRows).catch(() => {});
    Promise.all([
      api<{ data: InvoiceHead[] }>("/invoices?status=unpaid&limit=100").then((r: any) => r.data ?? r),
      api<{ data: InvoiceHead[] }>("/invoices?status=partial&limit=100").then((r: any) => r.data ?? r),
      api<{ data: InvoiceHead[] }>("/invoices?status=overdue&limit=100").then((r: any) => r.data ?? r),
    ]).then((lists) => setOpen(lists.flat())).catch(() => {});
  };
  useEffect(load, []);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");
    try {
      const r = await api<{ pay_no: string }>("/payments", {
        method: "POST",
        body: JSON.stringify({ ...form, amount: Number(form.amount) }),
      });
      setMsg(`✅ ${r.pay_no} tercatat`);
      setForm({ invoice_id: "", amount: 0, method: "transfer", note: "" }); load();
    } catch (e: any) { setMsg(`❌ ${e.message}`); }
  };
  const sel = open.find((i) => i.id === form.invoice_id);
  return (
    <div>
      <h2>Pembayaran</h2>
      <Card title="Catat Pembayaran (parsial boleh)">
        <form onSubmit={submit} className="form-grid">
          <Field label="Invoice"><select className={inputCls} value={form.invoice_id} onChange={(e) => setForm({ ...form, invoice_id: e.target.value })} required>
            <option value="">— pilih invoice —</option>
            {open.map((i) => <option key={i.id} value={i.id}>{i.inv_no} · sisa {idr(i.outstanding)} [{i.status}]</option>)}
          </select></Field>
          <Field label="Jumlah (Rp)"><input className={inputCls} type="number" min={1} value={form.amount} onChange={(e) => setForm({ ...form, amount: +e.target.value })} required /></Field>
          <Field label="Metode"><select className={inputCls} value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
            {["transfer", "giro", "tunai", "tempo"].map((m) => <option key={m}>{m}</option>)}
          </select></Field>
          <Field label="Catatan"><input className={inputCls} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></Field>
          <div><Btn type="submit">Simpan</Btn> {sel && <small className="muted"> Sisa: {idr(sel.outstanding)}</small>} {msg && <span> {msg}</span>}</div>
        </form>
      </Card>
      <Card title={`Riwayat Pembayaran (${rows.length})`}>
        <table className="tbl"><thead><tr><th>No</th><th>Tanggal</th><th>Invoice</th><th>Customer</th><th>Metode</th><th>Jumlah</th></tr></thead>
          <tbody>{rows.slice(0, 50).map((r) => (
            <tr key={r.id}><td><code>{r.pay_no}</code></td><td className="muted">{r.date}</td><td>{r.inv_no}</td>
              <td>{r.customer_name}</td><td><span className="pill">{r.method}</span></td><td className="num good">{idr(r.amount)}</td></tr>
          ))}</tbody></table>
      </Card>
    </div>
  );
}

/* ---------- Masters ---------- */
function Customers() {
  const [rows, setRows] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [dists, setDists] = useState<Distributor[]>([]);
  const [form, setForm] = useState({ code: "", name: "", type: "apotek", city: "", phone: "", credit_limit: 100000000, top_days: 30, distributor_id: "" });
  const load = () => {
    const p = new URLSearchParams({ limit: "30", ...(search ? { search } : {}), ...(type ? { type } : {}) });
    api<{ data: Customer[] }>(`/customers?${p}`).then((r: any) => setRows(r.data ?? r)).catch(() => {});
  };
  useEffect(() => { load(); api<Distributor[]>("/distributors").then(setDists).catch(() => {}); }, []);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await api("/customers", { method: "POST", body: JSON.stringify({ ...form, distributor_id: form.distributor_id || undefined }) });
    setForm({ code: "", name: "", type: "apotek", city: "", phone: "", credit_limit: 100000000, top_days: 30, distributor_id: "" });
    load();
  };
  return (
    <div>
      <h2>Customers</h2>
      <Card title="Customer Baru">
        <form onSubmit={submit} className="form-grid">
          <Field label="Kode"><input className={inputCls} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required placeholder="CUS-…" /></Field>
          <Field label="Nama"><input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field>
          <Field label="Tipe"><select className={inputCls} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            {["apotek", "rumah_sakit", "klinik", "puskesmas", "toko_obat"].map((t) => <option key={t}>{t}</option>)}
          </select></Field>
          <Field label="Kota"><input className={inputCls} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required /></Field>
          <Field label="Telepon"><input className={inputCls} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          <Field label="Distributor"><select className={inputCls} value={form.distributor_id} onChange={(e) => setForm({ ...form, distributor_id: e.target.value })}>
            <option value="">—</option>
            {dists.map((d) => <option key={d.id} value={d.id}>{d.code} — {d.name}</option>)}
          </select></Field>
          <div><Btn type="submit">Simpan</Btn></div>
        </form>
      </Card>
      <Card title="Daftar Customer" action={
        <div className="row-gap">
          <select className={inputCls} style={{ width: 150 }} value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">Semua tipe</option>
            {["apotek", "rumah_sakit", "klinik", "puskesmas", "toko_obat"].map((t) => <option key={t}>{t}</option>)}
          </select>
          <input className={`${inputCls} pill-search`} placeholder="⌕ Cari…" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load()} />
          <Btn onClick={load}>Terapkan</Btn>
        </div>
      }>
        <table className="tbl"><thead><tr><th>Kode</th><th>Nama</th><th>Tipe</th><th>Kota</th><th>Order</th><th>Revenue</th><th>Outstanding</th></tr></thead>
          <tbody>{rows.map((c) => (
            <tr key={c.id}><td><code>{c.code}</code></td><td>{c.name}</td><td><span className="pill">{c.type}</span></td>
              <td>{c.city}</td><td className="num">{c.total_orders}</td><td className="num">{idrShort(c.total_revenue ?? 0)}</td>
              <td className="num bad">{idr(c.outstanding ?? 0)}</td></tr>
          ))}</tbody></table>
      </Card>
    </div>
  );
}

function Distributors() {
  const [rows, setRows] = useState<Distributor[]>([]);
  const [form, setForm] = useState({ code: "", name: "", region: "", phone: "", type: "sub", credit_limit: 500000000, top_days: 30 });
  const load = () => api<Distributor[]>("/distributors").then(setRows).catch(() => {});
  useEffect(load, []);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await api("/distributors", { method: "POST", body: JSON.stringify(form) });
    setForm({ code: "", name: "", region: "", phone: "", type: "sub", credit_limit: 500000000, top_days: 30 });
    load();
  };
  return (
    <div>
      <h2>Distributors</h2>
      <div className="grid2">
        <Card title="Distributor Baru">
          <form onSubmit={submit} className="form-col">
            <Field label="Kode"><input className={inputCls} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required placeholder="DST-…" /></Field>
            <Field label="Nama"><input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field>
            <Field label="Region"><input className={inputCls} value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} required /></Field>
            <Field label="Telepon"><input className={inputCls} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
            <div><Btn type="submit">Simpan</Btn></div>
          </form>
        </Card>
        <Card title="Daftar Distributor">
          <table className="tbl"><thead><tr><th>Kode</th><th>Nama</th><th>Customer</th><th>Revenue</th></tr></thead>
            <tbody>{rows.map((d) => (
              <tr key={d.id}><td><code>{d.code}</code></td><td>{d.name}<br /><small className="muted">{d.region} · <span className="pill">{d.type}</span></small></td>
                <td className="num">{d.total_customers}</td><td className="num">{idrShort(d.total_revenue ?? 0)}</td></tr>
            ))}</tbody></table>
        </Card>
      </div>
    </div>
  );
}

function Reps() {
  const [rows, setRows] = useState<Rep[]>([]);
  const [form, setForm] = useState({ code: "", name: "", area: "", phone: "", monthly_target: 200000000 });
  const load = () => api<Rep[]>("/sales-reps").then(setRows).catch(() => {});
  useEffect(load, []);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await api("/sales-reps", { method: "POST", body: JSON.stringify(form) });
    setForm({ code: "", name: "", area: "", phone: "", monthly_target: 200000000 });
    load();
  };
  return (
    <div>
      <h2>Sales Team</h2>
      <div className="grid2">
        <Card title="Sales Baru">
          <form onSubmit={submit} className="form-col">
            <Field label="Kode"><input className={inputCls} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required placeholder="SLR-…" /></Field>
            <Field label="Nama"><input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field>
            <Field label="Area"><input className={inputCls} value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} required /></Field>
            <Field label="Target Bulanan (Rp)"><input className={inputCls} type="number" value={form.monthly_target} onChange={(e) => setForm({ ...form, monthly_target: +e.target.value })} /></Field>
            <div><Btn type="submit">Simpan</Btn></div>
          </form>
        </Card>
        <Card title="Daftar Sales">
          <table className="tbl"><thead><tr><th>Kode</th><th>Nama</th><th>Order</th><th>Revenue</th></tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.id}><td><code>{r.code}</code></td><td>{r.name}<br /><small className="muted">{r.area} · target {idrShort(r.monthly_target)}</small></td>
                <td className="num">{r.total_orders}</td><td className="num">{idrShort(r.total_revenue ?? 0)}</td></tr>
            ))}</tbody></table>
        </Card>
      </div>
    </div>
  );
}

function Products() {
  const [rows, setRows] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const load = () => api<{ data: Product[] }>(`/products?limit=60&search=${encodeURIComponent(search)}`).then((r: any) => setRows(r.data ?? r)).catch(() => {});
  useEffect(() => { load(); }, []);
  return (
    <div>
      <h2>Pricelist</h2>
      <Card title="Daftar Harga" action={
        <div className="row-gap">
          <input className={`${inputCls} pill-search`} placeholder="⌕ Cari…" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load()} />
          <Btn onClick={load}>Cari</Btn>
        </div>
      }>
        <table className="tbl"><thead><tr><th>SKU</th><th>Nama</th><th>Kategori</th><th>Satuan</th><th>Harga</th></tr></thead>
          <tbody>{rows.map((p) => (
            <tr key={p.id}><td><code>{p.sku}</code></td><td>{p.name}</td><td><span className="pill">{p.category}</span></td>
              <td>{p.unit}</td><td className="num">{idr(p.price)}</td></tr>
          ))}</tbody></table>
      </Card>
    </div>
  );
}

/* ---------- MCP Setup ---------- */
function McpSetup() {
  const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:4000";
  const tools: [string, string][] = [
    ["sales_summary", "Revenue, AR, overdue, achievement vs target"],
    ["sales_leaderboard", "Peringkat sales + achievement"],
    ["list_orders", "Daftar order (filter status / cari)"],
    ["get_order", "Detail order + invoice terkait"],
    ["create_order", "Buat sales order baru"],
    ["set_order_status", "Ubah status order"],
    ["list_invoices", "Daftar invoice (filter status)"],
    ["create_invoice", "Invoice PPN 11% dari order shipped"],
    ["record_payment", "Catat pembayaran (tolak overpayment)"],
    ["list_customers", "Cari/daftar customer"],
    ["list_products", "Pricelist produk"],
  ];
  return (
    <div>
      <h2>MCP — AI Agent Access</h2>
      <Card title="Endpoint">
        <p>Kontrol penjualan dari AI agent via <b>Model Context Protocol — Streamable HTTP</b>. Tanpa auth.</p>
        <pre className="code">{`${origin}/mcp`}</pre>
        <p className="muted">Mode: <b>stateful session</b> — handshake <code>initialize</code> → header <code>mcp-session-id</code> → pakai di request berikutnya.</p>
      </Card>
      <div className="grid2">
        <Card title="Coba via MCP Inspector">
          <pre className="code">npx @modelcontextprotocol/inspector</pre>
          <p className="muted">Transport <b>Streamable HTTP</b> → URL <b>{`${origin}/mcp`}</b> → Connect → tab Tools.</p>
        </Card>
        <Card title="Claude Desktop (via mcp-remote)">
          <pre className="code">{`{\n  "mcpServers": {\n    "ultra-sakti-sales": {\n      "command": "npx",\n      "args": ["mcp-remote", "${origin}/mcp"]\n    }\n  }\n}`}</pre>
        </Card>
      </div>
      <Card title="11 Tools Tersedia">
        <table className="tbl"><thead><tr><th>Tool</th><th>Fungsi</th></tr></thead>
          <tbody>{tools.map(([t, d]) => <tr key={t}><td><code>{t}</code></td><td>{d}</td></tr>)}</tbody></table>
      </Card>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
