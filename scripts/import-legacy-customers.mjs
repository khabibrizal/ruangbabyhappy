/**
 * Impor customer legacy dari CSV ke tabel profiles (role=member).
 *
 * Prasyarat:
 *  - Migration 0011 sudah dijalankan (FK auth dilonggarkan + kolom ig + id default).
 *  - File CSV ada di scripts/legacy-customers.csv (atau path di argv).
 *  - .env.local berisi NEXT_PUBLIC_SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY.
 *
 * Jalankan:
 *   node scripts/import-legacy-customers.mjs           # impor
 *   node scripts/import-legacy-customers.mjs --dry      # pratinjau (tanpa insert)
 *
 * Aman diulang: baris yang no_wa-nya sudah ada di profiles dilewati.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DRY = process.argv.includes("--dry");
const CSV_PATH = process.argv.find((a) => a.endsWith(".csv")) ?? join(ROOT, "scripts", "legacy-customers.csv");

// --- env ---
function loadEnv() {
  const txt = readFileSync(join(ROOT, ".env.local"), "utf8");
  const env = {};
  for (const line of txt.split(/\r?\n/)) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
  return env;
}
const env = loadEnv();
const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) throw new Error("URL/Service key tidak ditemukan di .env.local");

// --- CSV parser (handle quoted fields, comma & newline di dalam quote) ---
function parseCsv(text) {
  const rows = [];
  let field = "", row = [], inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQ = false;
      } else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); field = ""; row = []; }
    else if (c === "\r") { /* skip */ }
    else field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

// --- pembersih ---
function stripMarks(s) { return (s || "").replace(/[‪‬‎‏ ]/g, ""); }

function cleanNama(s) { return stripMarks(s).replace(/\s+/g, " ").trim(); }

function cleanPhone(raw) {
  let s = stripMarks(raw).split(/[\/,]/)[0]; // ambil nomor pertama bila ada beberapa
  s = s.replace(/\(.*?\)/g, "");             // buang "(WA)" dsb
  let d = s.replace(/[^\d]/g, "");
  if (!d) return null;
  if (d.startsWith("0")) d = "62" + d.slice(1);
  else if (d.startsWith("8")) d = "62" + d;
  if (d.length < 9) return null;             // terlalu pendek -> anggap tak valid
  return d;
}

function cleanIgEmail(raw) {
  let s = stripMarks(raw).trim();
  let email = null;
  if (!s) return { ig: null, email: null };
  const em = s.match(/[^\s,@]+@[^\s,@]+\.[^\s,@]+/);
  if (em && !s.startsWith("@")) { email = em[0].toLowerCase(); s = s.replace(em[0], "").trim(); }
  s = s.replace(/https?:\/\/(www\.)?instagram\.com\//i, "").replace(/\?.*$/, "").replace(/\/+$/, "");
  s = s.replace(/^@/, "").trim();
  return { ig: s || null, email };
}

function parseTs(s) {
  const m = stripMarks(s).trim().match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{1,2})[:.](\d{2})/);
  if (!m) return 0;
  return Date.UTC(+m[3], +m[2] - 1, +m[1], +m[4], +m[5]);
}

// --- baca & map ---
const rows = parseCsv(readFileSync(CSV_PATH, "utf8"));
const header = rows[0].map((h) => h.trim());
const idx = (name) => header.indexOf(name);
const iTs = idx("Timestamp"), iNama = idx("Nama Orangtua"), iIg = idx("IG"), iTelp = idx("No Telp"), iAlamat = idx("Alamat");

let total = 0, skipKosong = 0;
const byKey = new Map();
for (let r = 1; r < rows.length; r++) {
  const row = rows[r];
  if (!row || row.length < 2) continue;
  const nama = cleanNama(row[iNama]);
  if (!nama || /^test$/i.test(nama)) { skipKosong++; continue; }
  total++;
  const ts = parseTs(row[iTs]);
  const no_wa = cleanPhone(row[iTelp]);
  const alamat = cleanNama(row[iAlamat]) || null;
  const { ig, email } = cleanIgEmail(row[iIg]);
  const key = no_wa ? `wa:${no_wa}` : `nm:${nama.toLowerCase()}`;
  const rec = { nama, no_wa, alamat, ig, email, ts };
  const prev = byKey.get(key);
  if (!prev) byKey.set(key, rec);
  else {
    // gabung: utamakan data dari ts terbaru, isi yg kosong dari yg lain
    const newer = rec.ts >= prev.ts ? rec : prev;
    const older = rec.ts >= prev.ts ? prev : rec;
    byKey.set(key, {
      nama: newer.nama || older.nama,
      no_wa: newer.no_wa || older.no_wa,
      alamat: newer.alamat || older.alamat,
      ig: newer.ig || older.ig,
      email: newer.email || older.email,
      ts: newer.ts,
    });
  }
}

const uniq = [...byKey.values()];
console.log(`Baris CSV diproses: ${total} (dilewati kosong/test: ${skipKosong})`);
console.log(`Unik setelah dedup: ${uniq.length}`);

// --- skip yg sudah ada di profiles (by no_wa) ---
async function fetchExistingPhones() {
  const set = new Set();
  let from = 0;
  for (;;) {
    const res = await fetch(`${URL}/rest/v1/profiles?select=no_wa&no_wa=not.is.null`, {
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, Range: `${from}-${from + 999}` },
    });
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) break;
    for (const p of data) if (p.no_wa) set.add(cleanPhone(p.no_wa));
    if (data.length < 1000) break;
    from += 1000;
  }
  return set;
}

const existing = await fetchExistingPhones();
const toInsert = uniq.filter((u) => !(u.no_wa && existing.has(u.no_wa))).map((u) => ({
  nama: u.nama,
  no_wa: u.no_wa,
  alamat: u.alamat,
  ig: u.ig,
  email: u.email,
  role: "member",
  created_at: u.ts ? new Date(u.ts).toISOString() : undefined,
}));
console.log(`Sudah ada di DB (by no_wa): ${uniq.length - toInsert.length}`);
console.log(`Akan di-insert: ${toInsert.length}`);

if (DRY) {
  console.log("\n--dry: contoh 5 baris pertama:");
  console.log(toInsert.slice(0, 5));
  process.exit(0);
}

// --- insert batch ---
let inserted = 0;
for (let i = 0; i < toInsert.length; i += 100) {
  const batch = toInsert.slice(i, i + 100);
  const res = await fetch(`${URL}/rest/v1/profiles`, {
    method: "POST",
    headers: {
      apikey: KEY, Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/json", Prefer: "return=minimal",
    },
    body: JSON.stringify(batch),
  });
  if (!res.ok) { console.error(`Batch ${i} gagal: ${res.status} ${await res.text()}`); process.exit(1); }
  inserted += batch.length;
  console.log(`  inserted ${inserted}/${toInsert.length}`);
}
console.log(`Selesai. Total customer legacy ditambahkan: ${inserted}`);
