import db from "./connection";
import { newId } from "../lib/id";
import { refreshInvoiceStatus } from "../modules/invoices";

const existing = (db.query("SELECT COUNT(*) AS c FROM products").get() as unknown as { c: number }).c;
if (existing > 0) {
  console.log(`✅ DB already seeded (${existing} products). Delete sales.db to reseed.`);
  process.exit(0);
}

console.log("🌱 Seeding Ultra Sakti sales (distributor & sales)...");

const rnd = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)] as T;
const pad3 = (n: number) => String(n).padStart(3, "0");
const pastDate = (minBack: number, maxBack: number) => {
  const d = new Date();
  d.setDate(d.getDate() - rnd(minBack, maxBack));
  return d.toISOString().slice(0, 10);
};
const addDays = (date: string, days: number) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

/* ---------- Distributor (8) ---------- */
const distDefs: [string, string, string, string, number][] = [
  ["DST-01", "Distribusi Utama Jakarta", "Jakarta", "pusat", 2000000000],
  ["DST-02", "Distribusi Bandung", "Bandung", "sub", 1000000000],
  ["DST-03", "Distribusi Surabaya", "Surabaya", "sub", 1000000000],
  ["DST-04", "Distribusi Medan", "Medan", "sub", 800000000],
  ["DST-05", "Distribusi Makassar", "Makassar", "sub", 800000000],
  ["DST-06", "Distribusi Semarang", "Semarang", "sub", 700000000],
  ["DST-07", "Distribusi Palembang", "Palembang", "sub", 600000000],
  ["DST-08", "Distribusi Denpasar", "Denpasar", "sub", 600000000],
];
const distIds: string[] = [];
for (const [code, name, region, type, limit] of distDefs) {
  const id = newId("DST");
  db.query("INSERT INTO distributors (id, code, name, region, address, contact, phone, type, credit_limit, top_days) VALUES ($id,$code,$name,$region,$addr,$contact,$phone,$type,$limit,30)")
    .run({
      $id: id, $code: code, $name: name, $region: region,
      $address: `Jl. Raya ${region} No. ${rnd(10, 200)}`, $contact: `PIC ${name.split(" ")[1]}`,
      $phone: `0${rnd(21, 361)}-${rnd(1000000, 9999999)}`, $type: type, $limit: limit,
    });
  distIds.push(id);
}

/* ---------- Sales reps (12) ---------- */
const repDefs: [string, string, string, number][] = [
  ["SLR-01", "Agus Santoso", "Jakarta Timur", 120000000],
  ["SLR-02", "Rina Marlina", "Jakarta Barat", 110000000],
  ["SLR-03", "Budi Hartono", "Bandung", 100000000],
  ["SLR-04", "Sari Wulandari", "Surabaya", 110000000],
  ["SLR-05", "Joko Prasetyo", "Medan", 90000000],
  ["SLR-06", "Dewi Anggraini", "Makassar", 85000000],
  ["SLR-07", "Hendra Gunawan", "Semarang", 80000000],
  ["SLR-08", "Maya Putri", "Palembang", 75000000],
  ["SLR-09", "Rudi Firmansyah", "Denpasar", 75000000],
  ["SLR-10", "Fitri Handayani", "Bekasi", 95000000],
  ["SLR-11", "Dedi Kurniawan", "Tangerang", 90000000],
  ["SLR-12", "Lina Marlina", "Bogor", 70000000],
];
const repIds: string[] = [];
for (const [code, name, area, target] of repDefs) {
  const id = newId("SLR");
  db.query("INSERT INTO sales_reps (id, code, name, area, phone, monthly_target) VALUES ($id,$code,$name,$area,$phone,$target)")
    .run({ $id: id, $code: code, $name: name, $area: area, $phone: `08${rnd(11, 59)}-${rnd(10000000, 99999999)}`, $target: target });
  repIds.push(id);
}

/* ---------- Customer (60) ---------- */
const cities = ["Jakarta Timur", "Jakarta Barat", "Bandung", "Surabaya", "Medan", "Makassar", "Semarang", "Palembang", "Denpasar", "Bekasi", "Tangerang", "Bogor"];
const apotekW = ["Sehat Jaya", "Medika Farma", "Husada", "Waras", "Sentosa", "Mitra Sehat", "Bunda", "Sumber Waras", "Kasih Ibu", "Anugerah", "Amanah", "Barokah"];
const rsW = ["Mitra Sehat", "Kasih Bunda", "Harapan Bangsa", "Sentosa", "Bunda Mulia", "Citra Husada", "Sejahtera", "Medika Utama", "Kasih Sayang", "Husada Bangsa", "Citra Medika", "Bunda Sehat"];
const klinikW = ["Sehati", "Senyum", "Melati", "Mawar", "Tulip", "Anggrek", "Flamboyan", "Kenanga", "Cempaka", "Dahlia", "Teratai", "Kamboja"];
const kecW = ["Cakung", "Cibubur", "Rungkut", "Tembung", "Panakkukang", "Tembalang", "Seberang Ulu", "Denpasar Selatan", "Tambun", "Ciledug", "Citeureup", "Koja"];
type CustT = { id: string; top: number; type: string };
const custs: CustT[] = [];
const typeByIdx = ["apotek", "apotek", "rumah_sakit", "klinik", "apotek", "toko_obat", "klinik", "puskesmas", "apotek", "rumah_sakit", "toko_obat", "klinik"];
const terms: Record<string, [number, number]> = {
  apotek: [100000000, 30], rumah_sakit: [500000000, 45], klinik: [75000000, 30],
  puskesmas: [50000000, 14], toko_obat: [25000000, 14],
};
for (let i = 0; i < 60; i++) {
  const type = typeByIdx[i % typeByIdx.length]!;
  const city = cities[i % cities.length]!;
  const k = Math.floor(i / typeByIdx.length);
  let name = "";
  if (type === "apotek") name = `Apotek ${apotekW[k % apotekW.length]} ${city}`;
  else if (type === "rumah_sakit") name = `RS ${rsW[k % rsW.length]} ${city}`;
  else if (type === "klinik") name = `Klinik Pratama ${klinikW[k % klinikW.length]} ${city}`;
  else if (type === "puskesmas") name = `Puskesmas ${kecW[k % kecW.length]}`;
  else name = `Toko Obat ${apotekW[(k + 4) % apotekW.length]} ${city}`;
  const [limit, top] = terms[type]!;
  const id = newId("CUS");
  db.query("INSERT INTO customers (id, code, name, type, city, address, phone, credit_limit, top_days, distributor_id) VALUES ($id,$code,$name,$type,$city,$addr,$phone,$limit,$top,$dist)")
    .run({
      $id: id, $code: `CUS-${pad3(i + 1)}`, $name: name, $type: type, $city: city,
      $addr: `Jl. ${kecW[(i + 3) % kecW.length]} Raya No. ${rnd(1, 150)}, ${city}`,
      $phone: `0${rnd(21, 361)}-${rnd(1000000, 9999999)}`,
      $limit: limit, $top: top, $dist: pick(distIds),
    });
  custs.push({ id, top, type });
}

/* ---------- Produk (80) ---------- */
type P = [string, string, number];
const groups: { cat: string; prefix: string; items: P[] }[] = [
  {
    cat: "Obat Bebas", prefix: "US-B", items: [
      ["Paracetamol 500mg strip 10", "box", 18000], ["Paracetamol Sirup 60ml", "botol", 22000],
      ["Ibuprofen 200mg strip 10", "box", 28000], ["Ibuprofen Sirup 60ml", "botol", 35000],
      ["Ambroxol Sirup 60ml", "botol", 32000], ["Bromhexine 8mg strip 10", "box", 24000],
      ["Guaifenesin Sirup 120ml", "botol", 27000], ["Dextromethorphan Sirup 60ml", "botol", 26000],
      ["Oralit box 50 sachet", "box", 75000], ["Antasida Tablet strip 10", "box", 15000],
      ["Vitamin C 500mg strip 10", "box", 20000], ["Vitamin B Complex strip 10", "box", 22000],
      ["Multivitamin Sirup 100ml", "botol", 38000], ["Minyak Kayu Putih 60ml", "botol", 25000],
      ["Minyak Telon 100ml", "botol", 32000], ["Povidone Iodine 100ml", "botol", 45000],
      ["Alkohol 70% 100ml", "botol", 15000], ["Kasa Steril box 16", "box", 28000],
      ["Plester Luka box 100", "box", 35000], ["Kapas Pembalut 250gr", "pack", 22000],
    ],
  },
  {
    cat: "Obat Bebas Terbatas", prefix: "US-T", items: [
      ["CTM 4mg strip 10", "box", 12000], ["Omeprazole 20mg strip 10", "box", 35000],
      ["Ranitidine 150mg strip 10", "box", 25000], ["Domperidone 10mg strip 10", "box", 30000],
      ["Chloramphenicol Tetes Mata 5ml", "botol", 18000], ["Gentamicin Salep 5g", "tube", 22000],
      ["Hydrocortisone Cream 5g", "tube", 25000], ["Ketoconazole Cream 5g", "tube", 28000],
      ["Miconazole Cream 10g", "tube", 30000], ["Permethrin Lotion 30ml", "botol", 45000],
      ["OBH Sirup 100ml", "botol", 24000], ["Tetes Hidung NaCl 10ml", "botol", 15000],
    ],
  },
  {
    cat: "Obat Keras", prefix: "US-K", items: [
      ["Amoxicillin 500mg strip 10", "box", 45000], ["Amoxicillin Sirup 60ml", "botol", 38000],
      ["Cefadroxil 500mg strip 10", "box", 65000], ["Cefixime 100mg strip 10", "box", 75000],
      ["Ciprofloxacin 500mg strip 10", "box", 55000], ["Tetracycline 500mg strip 10", "box", 35000],
      ["Metformin 500mg strip 10", "box", 28000], ["Glimepiride 2mg strip 10", "box", 35000],
      ["Amlodipine 5mg strip 10", "box", 25000], ["Amlodipine 10mg strip 10", "box", 32000],
      ["Captopril 25mg strip 10", "box", 22000], ["Simvastatin 10mg strip 10", "box", 30000],
      ["Atorvastatin 20mg strip 10", "box", 55000], ["Lansoprazole 30mg strip 10", "box", 48000],
      ["Ondansetron 4mg strip 10", "box", 60000], ["Salbutamol 4mg strip 10", "box", 25000],
      ["Methylprednisolone 4mg strip 10", "box", 38000], ["Dexamethasone 0.5mg strip 10", "box", 18000],
      ["Furosemide 40mg strip 10", "box", 22000], ["Allopurinol 100mg strip 10", "box", 25000],
      ["Cetirizine 10mg strip 10", "box", 30000], ["Spironolactone 25mg strip 10", "box", 35000],
    ],
  },
  {
    cat: "Suplemen", prefix: "US-S", items: [
      ["Vitamin C 1000mg Effervescent", "tube", 95000], ["Vitamin D3 1000IU box 30", "box", 85000],
      ["Zinc 20mg strip 10", "box", 35000], ["Kalsium + Vit D strip 10", "box", 45000],
      ["Omega 3 box 30", "box", 120000], ["Imun Booster box 30", "box", 110000],
      ["Echinacea Kapsul box 30", "box", 65000], ["Propolis Tetes 10ml", "botol", 85000],
      ["Curcuma Plus Sirup 100ml", "botol", 42000], ["Lysine Sirup 100ml", "botol", 38000],
    ],
  },
  {
    cat: "Herbal", prefix: "US-H", items: [
      ["Tolak Angin Cair box 12", "box", 48000], ["Madu Murni 500ml", "botol", 110000],
      ["Jahe Merah Instan box 10", "box", 35000], ["Temulawak Kapsul box 30", "box", 45000],
      ["Sambiloto Kapsul box 30", "box", 40000], ["Sari Kurma 350ml", "botol", 65000],
      ["Minyak Balur 100ml", "botol", 55000], ["Balsem Gosok 40gr", "pcs", 28000],
    ],
  },
  {
    cat: "Alat Kesehatan", prefix: "US-A", items: [
      ["Masker Medis box 50", "box", 35000], ["Handscoon Latex box 100", "box", 55000],
      ["Kasa Gulung 10cm", "roll", 12000], ["Underpad pack 10", "pack", 65000],
      ["Alkohol Swab box 100", "box", 35000], ["Syringe 3ml box 100", "box", 65000],
      ["Termometer Digital", "pcs", 55000], ["Tensimeter Digital", "pcs", 450000],
    ],
  },
];
const prods: { id: string; price: number }[] = [];
for (const g of groups) {
  g.items.forEach(([name, unit, price], i) => {
    const id = newId("PRD");
    db.query("INSERT INTO products (id, sku, name, category, unit, price) VALUES ($id,$sku,$name,$cat,$unit,$price)")
      .run({ $id: id, $sku: `${g.prefix}-${pad3(i + 1)}`, $name: name, $cat: g.cat, $unit: unit, $price: price });
    prods.push({ id, price });
  });
}

/* ---------- Orders (140) ---------- */
const qtyByType: Record<string, [number, number]> = {
  rumah_sakit: [50, 500], apotek: [10, 120], klinik: [5, 60], puskesmas: [10, 100], toko_obat: [5, 40],
};
const statusPlan: [string, number][] = [
  ["draft", 8], ["confirmed", 15], ["shipped", 20], ["invoiced", 90], ["cancelled", 7],
];
const statusList: string[] = statusPlan.flatMap(([s, n]) => Array(n).fill(s));
// acak urutan + bobot tanggal: 60% dalam 35 hari terakhir
const orderDates: string[] = statusList.map(() =>
  Math.random() < 0.75 ? pastDate(1, 35) : pastDate(36, 120)
);
type OrdT = { id: string; date: string; cust: CustT; total: number };
const invoicedOrders: OrdT[] = [];
statusList.forEach((status, i) => {
  const cust = pick(custs);
  const date = orderDates[i]!;
  const [qmin, qmax] = qtyByType[cust.type]!;
  const nItems = rnd(1, 5);
  let sub = 0, disc = 0;
  const lines: { p: string; q: number; pr: number; d: number; t: number }[] = [];
  for (let j = 0; j < nItems; j++) {
    const p = pick(prods);
    const qnty = rnd(qmin, qmax);
    const dpct = pick([0, 0, 0, 5, 10, 15]);
    const gross = p.price * qnty;
    const dd = Math.round(gross * (dpct / 100));
    lines.push({ p: p.id, q: qnty, pr: p.price, d: dpct, t: gross - dd });
    sub += gross;
    disc += dd;
  }
  const id = newId("SO");
  const no = `SO-${date.replaceAll("-", "")}-${1000 + i}`;
  db.query("INSERT INTO orders (id, so_no, customer_id, sales_rep_id, distributor_id, date, status, subtotal, discount_total, grand_total, note) VALUES ($id,$no,$c,$r,$d,$date,$s,$sub,$disc,$grand,$n)")
    .run({
      $id: id, $no: no, $c: cust.id, $r: pick(repIds), $d: pick(distIds),
      $date: date, $s: status, $sub: sub, $disc: disc, $grand: sub - disc,
      $n: status === "cancelled" ? "Batal atas permintaan customer" : null,
    });
  for (const l of lines) {
    db.query("INSERT INTO order_items (id, order_id, product_id, qty, price, discount, line_total) VALUES ($id,$o,$p,$q,$pr,$d,$t)")
      .run({ $id: newId("SOI"), $o: id, $p: l.p, $q: l.q, $pr: l.pr, $d: l.d, $t: l.t });
  }
  if (status === "invoiced") invoicedOrders.push({ id, date, cust, total: sub - disc });
});

/* ---------- Invoices + Payments ---------- */
const today = new Date().toISOString().slice(0, 10);
const dayDiff = (a: string, b: string) => Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
invoicedOrders.forEach((o, i) => {
  const invDate = addDays(o.date, rnd(1, 3));
  const due = addDays(invDate, o.cust.top);
  const ppn = Math.round(o.total * 0.11);
  const grand = o.total + ppn;
  const id = newId("INV");
  db.query("INSERT INTO invoices (id, inv_no, order_id, customer_id, date, due_date, subtotal, ppn, grand_total, paid_total, status) VALUES ($id,$no,$o,$c,$date,$due,$sub,$ppn,$grand,0,'unpaid')")
    .run({
      $id: id, $no: `INV-${invDate.slice(0, 7).replace("-", "")}-${1000 + i}`,
      $o: o.id, $c: o.cust.id, $date: invDate, $due: due, $sub: o.total, $ppn: ppn, $grand: grand,
    });
  const items = db.query("SELECT * FROM order_items WHERE order_id = $o").all({ $o: o.id }) as
    { product_id: string; qty: number; price: number; discount: number; line_total: number }[];
  for (const it of items) {
    db.query("INSERT INTO invoice_items (id, invoice_id, product_id, qty, price, discount, line_total) VALUES ($id,$inv,$p,$q,$pr,$d,$t)")
      .run({ $id: newId("INVI"), $inv: id, $p: it.product_id, $q: it.qty, $pr: it.price, $d: it.discount, $t: it.line_total });
  }
  // pembayaran realistis berdasar umur invoice
  const age = dayDiff(invDate, today);
  const roll = Math.random();
  let payPlan: number[] = [];
  if (age > 60) {
    if (roll < 0.92) payPlan = Math.random() < 0.7 ? [1] : [0.6, 0.4];
  } else if (age > 30) {
    if (roll < 0.7) payPlan = Math.random() < 0.7 ? [1] : [0.5, 0.5];
    else if (roll < 0.9) payPlan = [rnd(30, 60) / 100];
  } else {
    if (roll < 0.4) payPlan = [1];
    else if (roll < 0.65) payPlan = [rnd(30, 70) / 100];
  }
  let paid = 0;
  payPlan.forEach((frac, k) => {
    const amount = k === payPlan.length - 1 ? grand - paid : Math.round(grand * frac);
    if (amount <= 0) return;
    const pdate = addDays(invDate, rnd(1, Math.max(2, Math.min(age, 90))));
    db.query("INSERT INTO payments (id, pay_no, invoice_id, date, amount, method, note) VALUES ($id,$no,$inv,$date,$a,$m,$n)")
      .run({
        $id: newId("PAY"), $no: `PAY-${pdate.replaceAll("-", "")}-${1000 + i * 3 + k}`,
        $inv: id, $date: pdate > today ? today : pdate, $a: amount,
        $m: pick(["transfer", "transfer", "giro", "tunai", "tempo"]), $n: null,
      });
    paid += amount;
  });
  db.query("UPDATE invoices SET paid_total = $p WHERE id = $id").run({ $p: paid, $id: id });
  refreshInvoiceStatus(id);
});

/* ---------- Ringkasan ---------- */
const count = (t: string) => (db.query(`SELECT COUNT(*) AS c FROM ${t}`).get() as unknown as { c: number }).c;
const sum = (t: string, c: string, w = "1=1") =>
  (db.query(`SELECT COALESCE(SUM(${c}),0) AS s FROM ${t} WHERE ${w}`).get() as unknown as { s: number }).s;
const fmt = (n: number) => `Rp${Math.round(n).toLocaleString("id-ID")}`;
console.log("✅ Seed complete (sales)!");
console.log(`   Distributors: ${count("distributors")} | Reps: ${count("sales_reps")} | Customers: ${count("customers")} | Products: ${count("products")}`);
console.log(`   Orders: ${count("orders")} (${fmt(sum("orders", "grand_total", "status NOT IN ('draft','cancelled')"))}) | Invoices: ${count("invoices")} | Payments: ${count("payments")}`);
console.log(`   Outstanding AR: ${fmt(sum("invoices", "grand_total - paid_total", "status != 'paid'"))} | Overdue: ${fmt(sum("invoices", "grand_total - paid_total", "status = 'overdue'"))}`);
