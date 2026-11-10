import db from "./connection";
import { newId } from "../lib/id";

// Seed idempotent: skip if products already exist
const existing = (db.query("SELECT COUNT(*) AS c FROM products").get() as unknown as { c: number }).c;
if (existing > 0) {
  console.log(`✅ DB already seeded (${existing} products). Delete warehouse.db to reseed.`);
  process.exit(0);
}

console.log("🌱 Seeding Ultra Sakti warehouse (large dataset)...");

/* ---------- helpers ---------- */
const rnd = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)] as T;
const pad3 = (n: number) => String(n).padStart(3, "0");
const pastDate = (minBack: number, maxBack: number) => {
  const d = new Date();
  d.setDate(d.getDate() - rnd(minBack, maxBack));
  return d.toISOString().slice(0, 10);
};
const randExp = () => {
  const y = pick([2026, 2027, 2027, 2027, 2028]);
  return `${y}-${String(rnd(1, 12)).padStart(2, "0")}-${String(rnd(1, 28)).padStart(2, "0")}`;
};
const randBatch = () => `BT-${rnd(2025, 2026)}-${pad3(rnd(1, 250))}`;

/* ---------- Gudang (10) ---------- */
const warehouseDefs: [string, string, string, string][] = [
  ["GD-PST-01", "Gudang Pusat Jakarta", "Jl. Raya Bekasi KM 21, Cakung, Jakarta Timur", "pusat"],
  ["GD-CBN-01", "Gudang Cabang Bandung", "Jl. Soekarno Hatta No. 88, Bandung", "cabang"],
  ["GD-KAR-01", "Gudang Karantina", "Area QC, Jakarta Timur", "karantina"],
  ["GD-SBY-01", "Gudang Cabang Surabaya", "Jl. Rungkut Industri IV No. 12, Surabaya", "cabang"],
  ["GD-MDN-01", "Gudang Cabang Medan", "Jl. Gatot Subroto KM 7, Medan", "cabang"],
  ["GD-MKS-01", "Gudang Cabang Makassar", "Jl. Perintis Kemerdekaan KM 12, Makassar", "cabang"],
  ["GD-SMG-01", "Gudang Cabang Semarang", "Jl. Kaligawe KM 4, Semarang", "cabang"],
  ["GD-PLM-01", "Gudang Cabang Palembang", "Jl. Soekarno Hatta No. 45, Palembang", "cabang"],
  ["GD-DPS-01", "Gudang Cabang Denpasar", "Jl. Teuku Umar No. 120, Denpasar", "cabang"],
  ["GD-RTR-01", "Gudang Retur Jakarta", "Jl. Raya Bekasi KM 21 Blok R, Jakarta Timur", "retur"],
];
const whIds: Record<string, string> = {};
for (const [code, name, address, type] of warehouseDefs) {
  const id = newId("WH");
  db.query("INSERT INTO warehouses (id, code, name, address, type) VALUES ($id,$code,$name,$address,$type)")
    .run({ $id: id, $code: code, $name: name, $address: address, $type: type });
  whIds[code] = id;
}
const whPusat = whIds["GD-PST-01"]!;
const cabangIds = Object.entries(whIds).filter(([c]) => c !== "GD-PST-01").map(([, id]) => id);

/* ---------- Supplier (15) ---------- */
const supplierDefs: [string, string, string, string, string][] = [
  ["SUP-001", "PT Kimia Farma Trading", "Bpk. Andi", "021-4401234", "Jakarta"],
  ["SUP-002", "PT Anugerah Farmasi", "Ibu Sari", "022-7205678", "Bandung"],
  ["SUP-003", "PT Medika Sejahtera", "Bpk. Budi", "021-4609876", "Tangerang"],
  ["SUP-004", "PT Enseval Putera Megatrading", "Ibu Rina", "021-59409090", "Jakarta"],
  ["SUP-005", "PT Sumber Medika Nusantara", "Bpk. Joko", "031-8471234", "Surabaya"],
  ["SUP-006", "PT Cakra Pharma Distribusi", "Ibu Dewi", "061-6612345", "Medan"],
  ["SUP-007", "PT Bintang Obat Makassar", "Bpk. Hasan", "0411-467890", "Makassar"],
  ["SUP-008", "PT Prima Alkesindo", "Ibu Maya", "021-42876543", "Jakarta"],
  ["SUP-009", "PT Herbal Indo Jaya", "Bpk. Slamet", "0274-512345", "Yogyakarta"],
  ["SUP-010", "PT Sinar Farmako", "Ibu Lina", "024-8661234", "Semarang"],
  ["SUP-011", "PT Global Medisupplies", "Bpk. Ricky", "021-5678901", "Jakarta"],
  ["SUP-012", "PT Wira Pharma Logistik", "Ibu Tania", "0711-345678", "Palembang"],
  ["SUP-013", "PT Mitra Sehat Abadi", "Bpk. Agus", "0361-234567", "Denpasar"],
  ["SUP-014", "PT Duta Obat Nasional", "Ibu Fitri", "022-6123456", "Bandung"],
  ["SUP-015", "PT Nusa Sehat Distribusi", "Bpk. Dedi", "021-4789012", "Bekasi"],
];
const supIds: string[] = [];
for (const [code, name, contact, phone, city] of supplierDefs) {
  const id = newId("SUP");
  db.query("INSERT INTO suppliers (id, code, name, contact, phone, email, address) VALUES ($id,$code,$name,$contact,$phone,$email,$address)")
    .run({
      $id: id, $code: code, $name: name, $contact: contact, $phone: phone,
      $email: `${code.toLowerCase()}@example.co.id`, $address: city,
    });
  supIds.push(id);
}

/* ---------- Produk (120) ---------- */
// [nama, satuan, min_stok, harga]
type P = [string, string, number, number];
const groups: { cat: string; prefix: string; desc: string; items: P[] }[] = [
  {
    cat: "Obat Bebas", prefix: "US-B", desc: "Obat bebas umum",
    items: [
      ["Paracetamol 500mg strip 10", "box", 60, 18000],
      ["Paracetamol Sirup 120mg/5ml 60ml", "botol", 50, 22000],
      ["Ibuprofen 200mg strip 10", "box", 40, 28000],
      ["Ibuprofen Sirup 100mg/5ml 60ml", "botol", 40, 35000],
      ["Ambroxol Sirup 30mg/5ml 60ml", "botol", 50, 32000],
      ["Bromhexine Sirup 60ml", "botol", 40, 30000],
      ["Guaifenesin Sirup 120ml", "botol", 40, 27000],
      ["Dextromethorphan Sirup 60ml", "botol", 40, 26000],
      ["Oralit Sachet box 50", "box", 25, 75000],
      ["Antasida Tablet strip 10", "box", 40, 15000],
      ["Vitamin C 500mg strip 10", "box", 50, 20000],
      ["Vitamin B Complex strip 10", "box", 40, 22000],
      ["Multivitamin Sirup 100ml", "botol", 30, 38000],
      ["Minyak Kayu Putih 60ml", "botol", 50, 25000],
      ["Minyak Telon Bayi 100ml", "botol", 40, 32000],
      ["Minyak Angin Roll-On 8ml", "pcs", 60, 18000],
      ["Povidone Iodine 10% 100ml", "botol", 40, 45000],
      ["Alkohol 70% 100ml", "botol", 60, 15000],
      ["Rivanol 0.1% 100ml", "botol", 30, 20000],
      ["Kasa Steril 16x16 box 16", "box", 40, 28000],
      ["Plester Luka box 100", "box", 50, 35000],
      ["Kapas Pembalut 250gr", "pack", 30, 22000],
    ],
  },
  {
    cat: "Obat Bebas Terbatas", prefix: "US-T", desc: "Obat bebas terbatas, tanda lingkaran biru",
    items: [
      ["CTM 4mg strip 10", "box", 40, 12000],
      ["Omeprazole 20mg strip 10", "box", 30, 35000],
      ["Ranitidine 150mg strip 10", "box", 30, 25000],
      ["Domperidone 10mg strip 10", "box", 25, 30000],
      ["Chloramphenicol Tetes Mata 5ml", "botol", 30, 18000],
      ["Gentamicin Salep 0.1% 5g", "tube", 30, 22000],
      ["Hydrocortisone Cream 2.5% 5g", "tube", 30, 25000],
      ["Ketoconazole Cream 2% 5g", "tube", 30, 28000],
      ["Miconazole Cream 2% 10g", "tube", 25, 30000],
      ["Permethrin Lotion 5% 30ml", "botol", 20, 45000],
      ["Obat Batuk Hitam Sirup 100ml", "botol", 30, 24000],
      ["Ekspektoran Sirup 120ml", "botol", 30, 26000],
      ["Tetes Hidung NaCl 0.9% 10ml", "botol", 30, 15000],
      ["Salep Whitefield 30g", "tube", 25, 20000],
    ],
  },
  {
    cat: "Obat Keras", prefix: "US-K", desc: "Obat keras, wajib resep dokter",
    items: [
      ["Amoxicillin 500mg strip 10", "box", 40, 45000],
      ["Amoxicillin Sirup 125mg/5ml 60ml", "botol", 40, 38000],
      ["Cefadroxil 500mg strip 10", "box", 30, 65000],
      ["Cefixime 100mg strip 10", "box", 30, 75000],
      ["Ciprofloxacin 500mg strip 10", "box", 30, 55000],
      ["Tetracycline 500mg strip 10", "box", 25, 35000],
      ["Thiamphenicol 500mg strip 10", "box", 20, 48000],
      ["Metformin 500mg strip 10", "box", 40, 28000],
      ["Glimepiride 2mg strip 10", "box", 30, 35000],
      ["Glibenclamide 5mg strip 10", "box", 30, 20000],
      ["Amlodipine 5mg strip 10", "box", 40, 25000],
      ["Amlodipine 10mg strip 10", "box", 30, 32000],
      ["Captopril 25mg strip 10", "box", 30, 22000],
      ["Lisinopril 10mg strip 10", "box", 25, 40000],
      ["Simvastatin 10mg strip 10", "box", 30, 30000],
      ["Atorvastatin 20mg strip 10", "box", 30, 55000],
      ["Lansoprazole 30mg strip 10", "box", 25, 48000],
      ["Ondansetron 4mg strip 10", "box", 25, 60000],
      ["Salbutamol 4mg strip 10", "box", 30, 25000],
      ["Salbutamol Sirup 2mg/5ml 60ml", "botol", 30, 28000],
      ["Methylprednisolone 4mg strip 10", "box", 30, 38000],
      ["Dexamethasone 0.5mg strip 10", "box", 30, 18000],
      ["Furosemide 40mg strip 10", "box", 25, 22000],
      ["Spironolactone 25mg strip 10", "box", 20, 35000],
      ["Allopurinol 100mg strip 10", "box", 25, 25000],
      ["Gabapentin 100mg strip 10", "box", 20, 50000],
    ],
  },
  {
    cat: "Suplemen", prefix: "US-S", desc: "Suplemen & vitamin",
    items: [
      ["Vitamin C 1000mg Effervescent tube 20", "tube", 50, 95000],
      ["Vitamin D3 1000IU box 30", "box", 40, 85000],
      ["Vitamin E 400IU box 30", "box", 30, 75000],
      ["Zinc 20mg strip 10", "box", 40, 35000],
      ["Zat Besi + Vit C strip 10", "box", 30, 40000],
      ["Kalsium + Vit D strip 10", "box", 30, 45000],
      ["Omega 3 Fish Oil box 30", "box", 25, 120000],
      ["Imun Booster C+D+Zinc box 30", "box", 40, 110000],
      ["Echinacea Kapsul box 30", "box", 30, 65000],
      ["Habbatussauda Kapsul box 60", "box", 25, 70000],
      ["Propolis Tetes 10ml", "botol", 30, 85000],
      ["Multivitamin + Ginseng strip 10", "box", 40, 30000],
      ["Curcuma Plus Sirup 100ml", "botol", 30, 42000],
      ["Lysine Sirup 100ml", "botol", 30, 38000],
      ["Susu Kalsium Senior 400gr", "pack", 25, 95000],
      ["Oralit + Zinc box 20", "box", 25, 55000],
    ],
  },
  {
    cat: "Herbal", prefix: "US-H", desc: "Obat herbal & tradisional",
    items: [
      ["Tolak Angin Cair box 12", "box", 60, 48000],
      ["Madu Murni 500ml", "botol", 30, 110000],
      ["Madu Sachet box 12", "box", 40, 55000],
      ["Jahe Merah Instan box 10", "box", 40, 35000],
      ["Temulawak Kapsul box 30", "box", 30, 45000],
      ["Sambiloto Kapsul box 30", "box", 30, 40000],
      ["Kunyit Asam box 5", "box", 40, 25000],
      ["Beras Kencur box 5", "box", 40, 25000],
      ["Sari Kurma 350ml", "botol", 30, 65000],
      ["Wedang Uwuh box 10", "box", 30, 30000],
      ["Teh Herbal Detox box 20", "box", 30, 45000],
      ["Minyak Balur 100ml", "botol", 30, 55000],
      ["Balsem Gosok 40gr", "pcs", 50, 28000],
      ["Plester Koyo box 10", "box", 50, 22000],
    ],
  },
  {
    cat: "Alat Kesehatan", prefix: "US-A", desc: "Alat kesehatan & habis pakai",
    items: [
      ["Masker Medis 3-Ply box 50", "box", 120, 35000],
      ["Masker KN95 box 10", "box", 80, 55000],
      ["Masker Anak Motif box 50", "box", 60, 40000],
      ["Handscoon Latex box 100", "box", 80, 55000],
      ["Handscoon Nitrile box 100", "box", 60, 85000],
      ["Kasa Gulung 10cm", "roll", 60, 12000],
      ["Kasa Steril box 16", "box", 50, 28000],
      ["Plester Kain Roll 5m", "roll", 60, 18000],
      ["Underpad 60x90 pack 10", "pack", 40, 65000],
      ["Alkohol Swab box 100", "box", 60, 35000],
      ["Syringe 1ml box 100", "box", 30, 75000],
      ["Syringe 3ml box 100", "box", 30, 65000],
      ["Syringe 5ml box 100", "box", 30, 70000],
      ["Infus Set Dewasa", "pcs", 40, 15000],
      ["Abocath 22G", "pcs", 40, 18000],
      ["Termometer Digital", "pcs", 40, 55000],
      ["Tensimeter Digital Lengan", "pcs", 20, 450000],
      ["Oksimeter Jari", "pcs", 25, 250000],
      ["Nebulizer Kompresor", "pcs", 10, 750000],
      ["Timbangan Badan Digital", "pcs", 20, 180000],
      ["Stetoskop Dewasa", "pcs", 15, 250000],
      ["Kursi Roda Standar", "pcs", 5, 1500000],
      ["Tongkat Jalan Single Stick", "pcs", 15, 120000],
      ["Perban Elastis 10cm", "roll", 50, 25000],
      ["Mitella Kain Segitiga", "pcs", 40, 15000],
      ["Kantong Urine 2000ml", "pcs", 40, 12000],
      ["Sarung Tangan Steril (pasang)", "pack", 50, 20000],
      ["Penutup Kepala Medis box 100", "box", 40, 45000],
    ],
  },
];

const productIds: { id: string; price: number }[] = [];
for (const g of groups) {
  g.items.forEach(([name, unit, min, price], i) => {
    const id = newId("PRD");
    const sku = `${g.prefix}-${pad3(i + 1)}`;
    db.query("INSERT INTO products (id, sku, name, category, unit, min_stock, price, description) VALUES ($id,$sku,$name,$category,$unit,$min_stock,$price,$description)")
      .run({
        $id: id, $sku: sku, $name: name, $category: g.cat, $unit: unit,
        $min_stock: min, $price: price, $description: g.desc,
      });
    productIds.push({ id, price });
  });
}

/* ---------- Stok awal ---------- */
const addStock = (pid: string, wid: string, batch: string, exp: string, loc: string, qty: number) => {
  const existing = db
    .query("SELECT id FROM stocks WHERE product_id = $p AND warehouse_id = $w AND batch_no = $b")
    .get({ $p: pid, $w: wid, $b: batch }) as { id: string } | null;
  if (existing) {
    db.query("UPDATE stocks SET qty = qty + $q, updated_at = datetime('now') WHERE id = $id")
      .run({ $q: qty, $id: existing.id });
  } else {
    db.query("INSERT INTO stocks (id, product_id, warehouse_id, batch_no, expired_date, location, qty) VALUES ($id,$p,$w,$b,$exp,$loc,$qty)")
      .run({ $id: newId("STK"), $p: pid, $w: wid, $b: batch, $exp: exp, $loc: loc, $qty: qty });
  }
};

const racks = ["A-01", "A-02", "A-03", "B-01", "B-02", "C-01", "C-02", "D-01"];
productIds.forEach(({ id }, i) => {
  // gudang pusat selalu ada, 1-2 batch
  addStock(id, whPusat, randBatch(), randExp(), pick(racks), rnd(50, 800));
  if (i % 2 === 0) addStock(id, whPusat, randBatch(), randExp(), pick(racks), rnd(20, 300));
  // 45% ada di cabang acak
  if (Math.random() < 0.45) {
    addStock(id, pick(cabangIds), randBatch(), randExp(), pick(racks), rnd(10, 200));
  }
  // 15% stok kritis (di bawah min) untuk demo low-stock alert
  if (i % 7 === 0) {
    addStock(id, pick(cabangIds), randBatch(), "2026-11-15", pick(racks), rnd(1, 5));
  }
});

/* ---------- Riwayat Inbound (35) ---------- */
for (let i = 0; i < 35; i++) {
  const hid = newId("IN");
  const wid = Math.random() < 0.7 ? whPusat : pick(cabangIds);
  const sid = pick(supIds);
  const date = pastDate(5, 120);
  const no = `IN-${date.replaceAll("-", "")}-${1000 + i}`;
  db.query("INSERT INTO inbound_headers (id, trx_no, warehouse_id, supplier_id, date, note) VALUES ($id,$no,$w,$s,$d,$n)")
    .run({ $id: hid, $no: no, $w: wid, $s: sid, $d: date, $n: `PO-2026-${2000 + i} penerimaan rutin` });
  const nItems = rnd(1, 4);
  for (let j = 0; j < nItems; j++) {
    const p = pick(productIds);
    const batch = randBatch();
    const exp = randExp();
    const qty = rnd(10, 200);
    db.query("INSERT INTO inbound_items (id, inbound_id, product_id, batch_no, expired_date, qty, price) VALUES ($id,$h,$p,$b,$exp,$q,$pr)")
      .run({ $id: newId("INI"), $h: hid, $p: p.id, $b: batch, $exp: exp, $q: qty, $pr: p.price });
    addStock(p.id, wid, batch, exp, pick(racks), qty);
  }
}

/* ---------- Riwayat Outbound (35) ---------- */
const destinations = [
  "Apotek Sehat Jaya Bandung", "RS Mitra Keluarga Bekasi", "Klinik Pratama Sehati",
  "Apotek Medika Surabaya", "RSUD Cengkareng", "Puskesmas Cakung",
  "Apotek Farma Medan", "RS Hermina Makassar", "Klinik Gigi Senyum",
  "Apotek 24 Jam Cibubur", "RS Siloam Semarang", "Distributor Cabang Palembang",
  "Apotek Bali Sehat Denpasar", "RSUD Bandung", "Klinik Ibu & Anak Melati",
];
for (let i = 0; i < 35; i++) {
  const wid = Math.random() < 0.6 ? whPusat : pick(cabangIds);
  const avail = db
    .query("SELECT id, product_id, batch_no, qty FROM stocks WHERE warehouse_id = $w AND qty > 25 ORDER BY RANDOM() LIMIT 3")
    .all({ $w: wid }) as { id: string; product_id: string; batch_no: string; qty: number }[];
  if (!avail.length) continue;
  const hid = newId("OUT");
  const date = pastDate(2, 100);
  const no = `OUT-${date.replaceAll("-", "")}-${1000 + i}`;
  db.query("INSERT INTO outbound_headers (id, trx_no, warehouse_id, destination, date, note) VALUES ($id,$no,$w,$d,$dt,$n)")
    .run({ $id: hid, $no: no, $w: wid, $d: pick(destinations), $dt: date, $n: `SJ-2026-${3000 + i}` });
  for (const s of avail) {
    const qty = Math.min(s.qty - 5, rnd(5, 60));
    if (qty < 1) continue;
    db.query("INSERT INTO outbound_items (id, outbound_id, product_id, batch_no, qty) VALUES ($id,$h,$p,$b,$q)")
      .run({ $id: newId("OUTI"), $h: hid, $p: s.product_id, $b: s.batch_no, $q: qty });
    db.query("UPDATE stocks SET qty = qty - $q, updated_at = datetime('now') WHERE id = $id")
      .run({ $q: qty, $id: s.id });
  }
}

/* ---------- Skenario realistis: ~15% produk menipis / kosong ---------- */
// Pilih acak produk yang stoknya masih aman, lalu buat menipis.
// Dijalankan SETELAH riwayat transaksi agar alert tetap muncul.
const cands = db
  .query(
    `SELECT p.id, p.min_stock FROM products p
     LEFT JOIN stocks s ON s.product_id = p.id
     GROUP BY p.id HAVING COALESCE(SUM(s.qty), 0) > p.min_stock
     ORDER BY RANDOM() LIMIT 18`
  )
  .all() as { id: string; min_stock: number }[];
for (const c of cands) {
  db.query("DELETE FROM stocks WHERE product_id = $p").run({ $p: c.id });
  // 30% kosong total (habis, perlu PO), sisanya sisa 1..50% dari min stok
  const q = Math.random() < 0.3 ? 0 : rnd(1, Math.max(1, Math.floor(c.min_stock * 0.5)));
  if (q > 0) {
    db.query(
      "INSERT INTO stocks (id, product_id, warehouse_id, batch_no, expired_date, location, qty) VALUES ($id,$p,$w,$b,$exp,$loc,$qty)"
    ).run({
      $id: newId("STK"), $p: c.id, $w: whPusat,
      $b: randBatch(), $exp: randExp(), $loc: pick(racks), $qty: q,
    });
  }
}

/* ---------- Ringkasan ---------- */
const count = (t: string) => (db.query(`SELECT COUNT(*) AS c FROM ${t}`).get() as unknown as { c: number }).c;
const totalStock = (db.query("SELECT COALESCE(SUM(qty),0) AS s FROM stocks").get() as unknown as { s: number }).s;
console.log("✅ Seed complete (large dataset)!");
console.log(`   Products: ${count("products")} | Warehouses: ${count("warehouses")} | Suppliers: ${count("suppliers")}`);
console.log(`   Stock rows: ${count("stocks")} | Total units: ${totalStock.toLocaleString("id-ID")}`);
console.log(`   Inbound: ${count("inbound_headers")} trx / ${count("inbound_items")} items | Outbound: ${count("outbound_headers")} trx / ${count("outbound_items")} items`);
