# Ruang Baby Happy — Plan 7: Admin Buat Transaksi (multi-item)

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development atau superpowers:executing-plans. Steps checkbox.

**Goal:** Admin membuat transaksi atas nama customer: cari/buat customer → pilih banyak **produk + jumlah** untuk **satu jadwal** (tanggal+sesi+lokasi+anak) → isi ongkos/diskon/DP + status bayar + status pengerjaan → simpan → diarahkan ke detail (yang sudah punya Invoice + Kirim WA).

**Keputusan terkunci:** (1) 1 transaksi = 1 jadwal, banyak item paket (qty). (2) Customer baru → **akun member auto-password** (Auth Admin API). (3) `jumlah` = kuantitas paket; subtotal item = harga×qty; total = Σ subtotal.

**Architecture:** Tambah tabel `booking_item` (baris item per booking). `booking.package_id` = paket **primary** (item pertama) → tetap menjalankan layanan/kapasitas/WA-routing/tampilan lama. `payment.total` = Σ(harga×qty). Admin **tidak diblok kapasitas** (otoritatif). Invoice & detail menampilkan item bila ada; flow member (1 paket) tak berubah & tetap kompatibel (tanpa item → tampil baris paket tunggal seperti sekarang).

**Tech Stack:** Next.js 16 (server actions + client form), Supabase (Auth Admin API + service-role), @react-pdf, Playwright/Vitest.

**Prasyarat:** Plan 1–6 selesai. **1 SQL manual** (Task 1). Akun admin seperti biasa.

> **GOTCHA:** UA non-browser utk setup REST E2E; cast nested-select PostgREST; `input[value=...]` (bukan getByDisplayValue); kill zombie port; build Turbopack kadang timeout (ulangi).

---

## File Structure

```
supabase/migrations/0005_booking_item.sql      # tabel item (manual SQL)
src/lib/admin/customerSearch.ts                 # cariCustomer (server action, return data)
src/lib/admin/createTransaksiAdmin.ts           # buatTransaksiAdmin (server action)
src/lib/booking/queries.ts                       # (+ getBookingItems; sertakan items di getDetailTransaksi)
src/app/admin/transaksi/baru/page.tsx            # halaman (load paket/layanan/sesi/zona)
src/app/admin/transaksi/baru/FormTransaksiBaru.tsx  # client form
src/app/admin/transaksi/page.tsx                 # (+) tombol "Transaksi Baru"
src/app/admin/transaksi/[kode]/page.tsx          # (+) tampil daftar item
src/lib/invoice/InvoiceDocument.tsx + route.ts   # (+) render banyak item
tests/e2e/transaksi-admin.spec.ts
```

---

## Task 1: Migration `booking_item`

- [ ] **Step 1 (MANUAL SQL — user jalankan):** `supabase/migrations/0005_booking_item.sql`

```sql
create table public.booking_item (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.booking (id) on delete cascade,
  package_id uuid not null references public.package (id),
  qty integer not null default 1 check (qty >= 1),
  harga integer not null,            -- snapshot harga satuan saat transaksi
  created_at timestamptz not null default now()
);
create index on public.booking_item (booking_id);
alter table public.booking_item enable row level security;
-- baca bila admin atau pemilik booking; tulis lewat server service-role.
create policy bi_select on public.booking_item for select using (
  public.is_admin() or exists (
    select 1 from public.booking b where b.id = booking_item.booking_id and b.customer_profile_id = auth.uid()
  )
);
```

(Tulis file ini ke repo; jalankan isinya di Supabase SQL Editor.)

- [ ] **Step 2: Commit** — `git add supabase/migrations/0005_booking_item.sql && git commit -m "feat(db): tabel booking_item (item transaksi multi-paket)"`

---

## Task 2: Server action cari customer

**Files:** Create `src/lib/admin/customerSearch.ts`

- [ ] **Step 1:**

```ts
"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";

export type CustomerHit = { id: string; nama: string | null; no_wa: string | null; email: string | null; alamat: string | null };

/** Cari customer (member) by no WA atau nama. Dipakai form admin. */
export async function cariCustomer(query: string): Promise<CustomerHit[]> {
  const me = await getCurrentProfile();
  if (me?.role !== "admin") return [];
  const q = query.trim();
  if (q.length < 2) return [];
  const admin = createAdminClient();
  const like = `%${q}%`;
  const { data } = await admin
    .from("profiles")
    .select("id, nama, no_wa, email, alamat")
    .or(`nama.ilike.${like},no_wa.ilike.${like}`)
    .limit(10);
  return (data as CustomerHit[]) ?? [];
}
```

- [ ] **Step 2: Commit** — `git add src/lib/admin/customerSearch.ts && git commit -m "feat(admin): cariCustomer (search by WA/nama)"`

---

## Task 3: Server action buat transaksi

**Files:** Create `src/lib/admin/createTransaksiAdmin.ts`

- [ ] **Step 1:**

```ts
"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { buildKodeBooking, randomSuffix } from "@/lib/booking/kode";
import { hitungDp } from "@/lib/booking/hitung";

type Item = { packageId: string; qty: number };

export async function buatTransaksiAdmin(formData: FormData) {
  const me = await getCurrentProfile();
  if (me?.role !== "admin") throw new Error("forbidden");
  const admin = createAdminClient();
  const back = (m: string) => redirect(`/admin/transaksi/baru?error=${encodeURIComponent(m)}`);

  // 1. Item (JSON dari client).
  let items: Item[] = [];
  try { items = JSON.parse(String(formData.get("items") ?? "[]")); } catch { /* ignore */ }
  items = items.filter((it) => it.packageId && it.qty > 0);
  if (items.length === 0) back("Minimal 1 produk");

  // 2. Customer: existing atau buat baru.
  let customerId = String(formData.get("customerId") ?? "").trim();
  if (!customerId) {
    const nama = String(formData.get("new_nama") ?? "").trim();
    const no_wa = String(formData.get("new_wa") ?? "").trim();
    const email = String(formData.get("new_email") ?? "").trim();
    const alamat = String(formData.get("new_alamat") ?? "").trim();
    if (!nama || !email) back("Customer baru: nama & email wajib");
    const { data: created, error: cErr } = await admin.auth.admin.createUser({
      email, password: crypto.randomUUID(), email_confirm: true,
    });
    if (cErr || !created.user) {
      // Email mungkin sudah terdaftar -> pakai profil yang ada.
      const { data: ex } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
      if (!ex) back("Gagal buat customer: " + (cErr?.message ?? "unknown"));
      customerId = (ex!.id as string);
    } else {
      customerId = created.user.id;
    }
    await admin.from("profiles").update({ nama, no_wa, alamat, email }).eq("id", customerId);
  }

  // 3. Harga paket (snapshot) + paket primary.
  const ids = items.map((i) => i.packageId);
  const { data: pkgs } = await admin.from("package").select("id, harga, dp_persen").in("id", ids);
  const pkgMap = new Map((pkgs ?? []).map((p) => [p.id as string, p as { id: string; harga: number; dp_persen: number }]));
  if (pkgMap.size === 0) back("Paket tidak ditemukan");
  const primary = pkgMap.get(items[0].packageId);
  const total = items.reduce((sum, it) => sum + (pkgMap.get(it.packageId)?.harga ?? 0) * it.qty, 0);

  // 4. Jadwal + lokasi + ongkos.
  const tanggal = String(formData.get("tanggal") ?? "");
  const sesiId = String(formData.get("sesiId") ?? "");
  if (!tanggal || !sesiId) back("Tanggal & sesi wajib");
  const { data: sesi } = await admin.from("sesi").select("jam_mulai").eq("id", sesiId).single();
  if (!sesi) back("Sesi tidak ditemukan");

  const lokasi = String(formData.get("lokasi_sesi") ?? "studio");
  const zonaId = String(formData.get("zonaId") ?? "").trim();
  const alamatSesi = String(formData.get("alamat_sesi") ?? "").trim();
  let ongkos = Math.max(0, Number(formData.get("ongkos") ?? 0));
  if (lokasi === "home" && ongkos === 0 && zonaId) {
    const { data: z } = await admin.from("zona_ongkos").select("biaya").eq("id", zonaId).single();
    ongkos = (z?.biaya as number) ?? 0;
  }

  // 5. Anak.
  const anakNama = String(formData.get("anak_nama") ?? "").trim();
  const anakBb = Number(formData.get("anak_bb") ?? 0);
  const anakJk = String(formData.get("anak_jk") ?? "");
  if (!anakNama || !anakBb || (anakJk !== "L" && anakJk !== "P")) back("Data anak belum lengkap");

  // 6. Diskon, DP, status.
  const diskon = Math.max(0, Number(formData.get("diskon") ?? 0));
  const dpRaw = String(formData.get("dp_amount") ?? "").trim();
  const dp = dpRaw === "" ? hitungDp(total + ongkos - diskon, primary?.dp_persen ?? 30) : Math.max(0, Number(dpRaw));
  const status = String(formData.get("status") ?? "unpaid");
  const rawTahap = String(formData.get("status_pengerjaan") ?? "");
  const tahap = ["pilih_foto", "edit", "cetak", "pengiriman", "selesai"].includes(rawTahap) ? rawTahap : null;
  const statusBooking = status === "lunas" ? "completed" : status === "dp_paid" ? "confirmed" : "pending";

  // 7. Insert booking (primary package).
  const kode = buildKodeBooking(tanggal, randomSuffix());
  const { data: booking, error: bErr } = await admin.from("booking").insert({
    kode_booking: kode,
    package_id: items[0].packageId,
    sesi_id: sesiId,
    customer_profile_id: customerId,
    anak_nama: anakNama, anak_bb: anakBb, anak_jk: anakJk,
    lokasi_sesi: lokasi,
    zona_id: lokasi === "home" ? (zonaId || null) : null,
    alamat_sesi: lokasi === "home" ? alamatSesi : null,
    tanggal, jam_mulai: sesi.jam_mulai as string,
    status_booking: statusBooking,
    status_pengerjaan: tahap,
  }).select("id").single();
  if (bErr || !booking) back(bErr?.message ?? "Gagal simpan booking");

  // 8. Insert item.
  await admin.from("booking_item").insert(
    items.map((it) => ({ booking_id: booking!.id, package_id: it.packageId, qty: it.qty, harga: pkgMap.get(it.packageId)?.harga ?? 0 })),
  );

  // 9. Insert payment.
  const paid = status === "dp_paid" || status === "lunas";
  await admin.from("payment").insert({
    booking_id: booking!.id, total, ongkos, diskon, dp_amount: dp,
    status_bayar: status,
    dibayar_at: paid ? new Date().toISOString() : null,
    dicatat_oleh: paid ? me.id : null,
  });

  redirect(`/admin/transaksi/${kode}`);
}
```

- [ ] **Step 2: Commit** — `git add src/lib/admin/createTransaksiAdmin.ts && git commit -m "feat(admin): buatTransaksiAdmin (customer resolve/create, multi-item, payment)"`

---

## Task 4: Query item + sertakan di detail

**Files:** Modify `src/lib/booking/queries.ts`

- [ ] **Step 1: Tambah di akhir `src/lib/booking/queries.ts`**

```ts
export type BookingItem = { nama: string; qty: number; harga: number };

/** Item-item paket pada sebuah booking (multi-item admin). Kosong utk booking 1-paket lama. */
export async function getBookingItems(bookingId: string): Promise<BookingItem[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("booking_item")
    .select("qty, harga, package:package_id(nama)")
    .eq("booking_id", bookingId)
    .order("created_at");
  const rows = (data as unknown as { qty: number; harga: number; package: { nama: string } | null }[]) ?? [];
  return rows.map((r) => ({ nama: r.package?.nama ?? "-", qty: r.qty, harga: r.harga }));
}
```

- [ ] **Step 2: Commit** — `git add src/lib/booking/queries.ts && git commit -m "feat(admin): getBookingItems"`

---

## Task 5: Halaman "Transaksi Baru" + form client

**Files:** Create `src/app/admin/transaksi/baru/page.tsx`, `src/app/admin/transaksi/baru/FormTransaksiBaru.tsx`; modify `src/app/admin/transaksi/page.tsx` (tombol)

- [ ] **Step 1: `src/app/admin/transaksi/baru/page.tsx`**

```tsx
import Link from "next/link";
import { listPaket, listLayanan, listSesi } from "@/lib/admin/masterQueries";
import { getZonaAktif } from "@/lib/catalog/queries";
import FormTransaksiBaru from "./FormTransaksiBaru";

export const dynamic = "force-dynamic";

export default async function TransaksiBaruPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const [paket, layanan, sesi, zona] = await Promise.all([listPaket(), listLayanan(), listSesi(), getZonaAktif()]);
  const layananNama = new Map(layanan.map((l) => [l.id, l.nama]));
  const paketAktif = paket.filter((p) => p.is_active).map((p) => ({
    id: p.id, nama: p.nama, harga: p.harga, dp_persen: p.dp_persen, layanan: layananNama.get(p.layanan_id) ?? "",
  }));
  const sesiAktif = sesi.filter((s) => s.is_active).map((s) => ({ id: s.id, nama: s.nama, jam_mulai: s.jam_mulai }));

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Transaksi Baru</h1>
        <Link href="/admin/transaksi" className="text-sm text-slate-500 underline">← Transaksi</Link>
      </div>
      {error && <p className="mt-3 rounded border border-red-300 bg-red-50 p-2 text-sm text-red-700">{error}</p>}
      <FormTransaksiBaru paket={paketAktif} sesi={sesiAktif} zona={zona} />
    </main>
  );
}
```

- [ ] **Step 2: `src/app/admin/transaksi/baru/FormTransaksiBaru.tsx`** (client)

```tsx
"use client";
import { useState } from "react";
import { buatTransaksiAdmin } from "@/lib/admin/createTransaksiAdmin";
import { cariCustomer, type CustomerHit } from "@/lib/admin/customerSearch";
import { formatRupiah } from "@/lib/format/rupiah";
import { hitungDp } from "@/lib/booking/hitung";

type Paket = { id: string; nama: string; harga: number; dp_persen: number; layanan: string };
type Sesi = { id: string; nama: string; jam_mulai: string };
type Zona = { id: string; nama: string; keterangan: string | null; biaya: number };
type Item = { packageId: string; qty: number };

const inp = "rounded-lg border border-slate-300 p-2 text-sm";

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function FormTransaksiBaru({ paket, sesi, zona }: { paket: Paket[]; sesi: Sesi[]; zona: Zona[] }) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<CustomerHit[] | null>(null);
  const [cust, setCust] = useState<CustomerHit | null>(null);
  const [baru, setBaru] = useState(false);

  const [items, setItems] = useState<Item[]>([{ packageId: paket[0]?.id ?? "", qty: 1 }]);
  const [lokasi, setLokasi] = useState<"studio" | "home">("studio");
  const [zonaId, setZonaId] = useState("");
  const [diskon, setDiskon] = useState(0);

  const hargaOf = (id: string) => paket.find((p) => p.id === id)?.harga ?? 0;
  const total = items.reduce((s, it) => s + hargaOf(it.packageId) * it.qty, 0);
  const ongkos = lokasi === "home" ? (zona.find((z) => z.id === zonaId)?.biaya ?? 0) : 0;
  const tagihan = total + ongkos - diskon;
  const dpPersenPrimary = paket.find((p) => p.id === items[0]?.packageId)?.dp_persen ?? 30;
  const dpAuto = hitungDp(tagihan, dpPersenPrimary);

  async function cari() {
    setHits(await cariCustomer(q));
  }

  return (
    <form action={buatTransaksiAdmin} className="mt-4 flex flex-col gap-5">
      <input type="hidden" name="items" value={JSON.stringify(items)} />
      <input type="hidden" name="customerId" value={cust?.id ?? ""} />

      {/* Customer */}
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="font-semibold text-slate-700">Customer</h2>
        {!baru && (
          <>
            <div className="mt-2 flex gap-2">
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari no WA / nama" className={`flex-1 ${inp}`} />
              <button type="button" onClick={cari} className="rounded-lg bg-slate-800 px-4 text-sm text-white">Cari</button>
            </div>
            {hits && hits.length === 0 && <p className="mt-2 text-sm text-slate-500">Tidak ditemukan. <button type="button" onClick={() => setBaru(true)} className="text-pink-600 underline">Buat customer baru</button></p>}
            {hits && hits.map((h) => (
              <button type="button" key={h.id} onClick={() => { setCust(h); setHits(null); }}
                className={`mt-2 block w-full rounded-lg border p-2 text-left text-sm ${cust?.id === h.id ? "border-pink-400 bg-pink-50" : "border-slate-200"}`}>
                <b>{h.nama ?? "-"}</b> · {h.no_wa ?? "-"} · {h.email ?? "-"}
              </button>
            ))}
            {cust && <p className="mt-2 rounded-lg bg-emerald-50 p-2 text-sm">Dipilih: <b>{cust.nama}</b> · {cust.no_wa} · {cust.email}</p>}
            {!baru && <button type="button" onClick={() => setBaru(true)} className="mt-2 text-xs text-pink-600 underline">+ Customer baru</button>}
          </>
        )}
        {baru && (
          <div className="mt-2 grid grid-cols-2 gap-2">
            <input name="new_nama" placeholder="Nama lengkap" className={`col-span-2 ${inp}`} required />
            <input name="new_wa" placeholder="No WhatsApp" className={inp} />
            <input name="new_email" type="email" placeholder="Email (utk akun)" className={inp} required />
            <input name="new_alamat" placeholder="Alamat" className={`col-span-2 ${inp}`} />
            <button type="button" onClick={() => { setBaru(false); }} className="col-span-2 text-xs text-slate-500 underline">← Pilih customer terdaftar</button>
          </div>
        )}
      </section>

      {/* Anak */}
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="font-semibold text-slate-700">Data Anak</h2>
        <input name="anak_nama" placeholder="Nama anak" className={`mt-2 block w-full ${inp}`} required />
        <div className="mt-2 grid grid-cols-2 gap-2">
          <input name="anak_bb" type="number" step="0.1" min="0" placeholder="BB (kg)" className={inp} required />
          <select name="anak_jk" defaultValue="" className={inp} required>
            <option value="" disabled>Jenis kelamin</option><option value="L">Laki-laki</option><option value="P">Perempuan</option>
          </select>
        </div>
      </section>

      {/* Item produk */}
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="font-semibold text-slate-700">Produk / Paket</h2>
        {items.map((it, idx) => (
          <div key={idx} className="mt-2 flex items-center gap-2">
            <select value={it.packageId} onChange={(e) => setItems(items.map((x, i) => i === idx ? { ...x, packageId: e.target.value } : x))} className={`flex-1 ${inp}`}>
              {paket.map((p) => <option key={p.id} value={p.id}>{p.layanan} · {p.nama} ({formatRupiah(p.harga)})</option>)}
            </select>
            <input type="number" min={1} value={it.qty} onChange={(e) => setItems(items.map((x, i) => i === idx ? { ...x, qty: Math.max(1, Number(e.target.value)) } : x))} className={`w-16 ${inp}`} />
            {items.length > 1 && <button type="button" onClick={() => setItems(items.filter((_, i) => i !== idx))} className="text-red-500">✕</button>}
          </div>
        ))}
        <button type="button" onClick={() => setItems([...items, { packageId: paket[0]?.id ?? "", qty: 1 }])} className="mt-2 text-sm text-pink-600 underline">+ Tambah produk</button>
      </section>

      {/* Jadwal + lokasi */}
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="font-semibold text-slate-700">Jadwal & Lokasi</h2>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <label className="text-sm">Tanggal<input type="date" name="tanggal" defaultValue={todayStr()} className={`mt-1 block w-full ${inp}`} required /></label>
          <label className="text-sm">Sesi<select name="sesiId" className={`mt-1 block w-full ${inp}`} required defaultValue={sesi[0]?.id ?? ""}>
            {sesi.map((s) => <option key={s.id} value={s.id}>{s.nama} ({s.jam_mulai.slice(0, 5)})</option>)}
          </select></label>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <label className={`cursor-pointer rounded-lg border p-2 text-center text-sm font-bold ${lokasi === "studio" ? "border-pink-400 bg-pink-50" : "border-slate-200"}`}>
            <input type="radio" name="lokasi_sesi" value="studio" className="hidden" checked={lokasi === "studio"} onChange={() => setLokasi("studio")} />Di Studio
          </label>
          <label className={`cursor-pointer rounded-lg border p-2 text-center text-sm font-bold ${lokasi === "home" ? "border-pink-400 bg-pink-50" : "border-slate-200"}`}>
            <input type="radio" name="lokasi_sesi" value="home" className="hidden" checked={lokasi === "home"} onChange={() => setLokasi("home")} />Home Service
          </label>
        </div>
        {lokasi === "home" && (
          <div className="mt-2 flex flex-col gap-2">
            <select name="zonaId" value={zonaId} onChange={(e) => setZonaId(e.target.value)} className={inp}>
              <option value="">Pilih zona…</option>
              {zona.map((z) => <option key={z.id} value={z.id}>{z.nama}{z.keterangan ? ` (${z.keterangan})` : ""} — {formatRupiah(z.biaya)}</option>)}
            </select>
            <textarea name="alamat_sesi" rows={2} placeholder="Alamat home service" className={inp} />
          </div>
        )}
      </section>

      {/* Pembayaran */}
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="font-semibold text-slate-700">Pembayaran</h2>
        <div className="mt-2 space-y-1 text-sm">
          <div className="flex justify-between"><span className="text-slate-500">Subtotal produk ({items.reduce((s, it) => s + it.qty, 0)} item)</span><span>{formatRupiah(total)}</span></div>
          {lokasi === "home" && <div className="flex justify-between"><span className="text-slate-500">Ongkos</span><span>{formatRupiah(ongkos)}</span></div>}
          <div className="flex items-center justify-between"><span className="text-slate-500">Diskon (Rp)</span>
            <input type="number" name="diskon" min={0} value={diskon} onChange={(e) => setDiskon(Math.max(0, Number(e.target.value)))} className={`w-32 ${inp}`} /></div>
          <div className="flex justify-between font-bold"><span>Total</span><span>{formatRupiah(tagihan)}</span></div>
        </div>
        <label className="mt-3 block text-sm">Nominal DP (Rp)
          <input type="number" name="dp_amount" min={0} placeholder={`Kosong = auto ${dpPersenPrimary}% (${formatRupiah(dpAuto)})`} className={`mt-1 block w-full ${inp}`} />
        </label>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <label className="text-sm">Status bayar<select name="status" defaultValue="unpaid" className={`mt-1 block w-full ${inp}`}>
            <option value="unpaid">Belum bayar</option><option value="dp_paid">Sudah DP</option><option value="lunas">Lunas</option>
          </select></label>
          <label className="text-sm">Status pengerjaan<select name="status_pengerjaan" defaultValue="" className={`mt-1 block w-full ${inp}`}>
            <option value="">Belum mulai</option><option value="pilih_foto">Pilih Foto</option><option value="edit">Edit</option><option value="cetak">Cetak</option><option value="pengiriman">Pengiriman</option><option value="selesai">Selesai</option>
          </select></label>
        </div>
      </section>

      <button className="h-11 rounded-full bg-grad font-bold text-white">Simpan Transaksi</button>
    </form>
  );
}
```

- [ ] **Step 3: Tombol di `src/app/admin/transaksi/page.tsx`** — pada header, ubah blok judul jadi menyertakan tombol. Ganti `<div className="flex items-center justify-between">...<h1>Transaksi</h1>...<Link>← Dashboard</Link></div>` agar ada tombol "Transaksi Baru":

```tsx
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Transaksi</h1>
        <div className="flex gap-3">
          <Link href="/admin/transaksi/baru" className="rounded-lg bg-pink-500 px-4 py-2 text-sm font-bold text-white">+ Transaksi Baru</Link>
          <Link href="/admin" className="text-sm text-slate-500 underline self-center">← Dashboard</Link>
        </div>
      </div>
```

- [ ] **Step 4: Commit** — `git add "src/app/admin/transaksi/baru" src/app/admin/transaksi/page.tsx && git commit -m "feat(admin): halaman Transaksi Baru (cari/buat customer, multi-item, jadwal, pembayaran)"`

---

## Task 6: Tampilkan item di detail + invoice

**Files:** Modify `src/app/admin/transaksi/[kode]/page.tsx`, `src/lib/invoice/InvoiceDocument.tsx`, `src/app/invoice/[kode]/route.ts`

- [ ] **Step 1: Detail admin** — di `src/app/admin/transaksi/[kode]/page.tsx`, import & tampilkan item. Tambah import:

```tsx
import { getBookingItems } from "@/lib/booking/queries";
```
Setelah `const d = await getDetailTransaksi(kode);` (dan cek notFound), tambah:

```tsx
  const items = await getBookingItems(d.id);
```
Lalu di blok info (setelah baris "Paket"), sisipkan daftar item bila ada:

```tsx
          {items.length > 0 && (
            <>
              <dt className="text-slate-500">Item</dt>
              <dd className="col-span-2">
                {items.map((it, i) => (
                  <div key={i}>{it.nama} × {it.qty} = {formatRupiah(it.harga * it.qty)}</div>
                ))}
              </dd>
            </>
          )}
```

- [ ] **Step 2: Invoice** — `src/app/invoice/[kode]/route.ts`: ambil item & teruskan. Tambah import `import { getBookingItems } from "@/lib/booking/queries";`, setelah `const d = await getDetailTransaksi(kode);` (dan cek null) tambah `const items = await getBookingItems(d.id);`, dan pada pemanggilan `InvoiceDocument({ d: { ... } })` tambah field `items: items.map((it) => ({ nama: it.nama, qty: it.qty, harga: it.harga }))`.

- [ ] **Step 3: InvoiceDocument** — `src/lib/invoice/InvoiceDocument.tsx`: tambah optional `items` ke `InvoiceData`:

```ts
  items?: { nama: string; qty: number; harga: number }[];
```
Lalu di bagian "Rincian Pesanan", ganti baris item paket tunggal: bila `d.items?.length`, render tiap item; selain itu render baris paket tunggal seperti sekarang:

```tsx
          {d.items && d.items.length > 0 ? (
            d.items.map((it, i) => (
              <View key={i} style={s.itemRow}>
                <View><Text style={s.itemName}>{it.nama}</Text><Text style={s.itemSub}>{it.qty} × {formatRupiah(it.harga)}</Text></View>
                <Text>{formatRupiah(it.harga * it.qty)}</Text>
              </View>
            ))
          ) : (
            <View style={s.itemRow}>
              <View><Text style={s.itemName}>{d.paket}</Text><Text style={s.itemSub}>{d.layanan} · {d.tanggal} · {d.sesi}</Text></View>
              <Text>{formatRupiah(d.total)}</Text>
            </View>
          )}
```

- [ ] **Step 4: Commit** — `git add "src/app/admin/transaksi/[kode]/page.tsx" "src/app/invoice" src/lib/invoice/InvoiceDocument.tsx src/lib/booking/queries.ts && git commit -m "feat(admin): tampilkan item transaksi di detail & invoice"`

---

## Task 7: E2E + verifikasi

**Files:** Create `tests/e2e/transaksi-admin.spec.ts`

- [ ] **Step 1:** E2E admin buat transaksi (customer terdaftar `member@...`, 1 produk qty 2, lunas) → diarahkan ke detail; cek invoice PDF. Bersihkan via REST `afterAll` (hapus booking by kode → cascade item & payment).

```ts
import { test, expect, request as pwRequest } from "@playwright/test";
import fs from "node:fs";

const ADMIN = { email: "admin@ruangbabyhappy.com", pass: "Admin12345!" };
function env(k: string){ const l=fs.readFileSync(".env.local","utf8").split("\n").find(x=>x.startsWith(k+"="));return l?l.slice(k.length+1).trim():""; }
const URL=env("NEXT_PUBLIC_SUPABASE_URL"), KEY=env("SUPABASE_SERVICE_ROLE_KEY");
let kode = "";

test.afterAll(async () => {
  const ctx = await pwRequest.newContext({ userAgent: "rbh-e2e-setup" });
  const h = { apikey: KEY, Authorization: `Bearer ${KEY}` };
  if (kode) await ctx.delete(`${URL}/rest/v1/booking?kode_booking=eq.${kode}`, { headers: h });
  await ctx.dispose();
});

test("admin buat transaksi multi-item utk customer terdaftar", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder("Email").fill(ADMIN.email);
  await page.getByPlaceholder("Password").fill(ADMIN.pass);
  await page.getByRole("button", { name: /^Masuk$/ }).click();
  await expect(page).toHaveURL(/\/admin/);

  await page.goto("/admin/transaksi");
  await page.getByRole("link", { name: /Transaksi Baru/i }).click();
  await expect(page).toHaveURL(/\/admin\/transaksi\/baru/);

  // cari customer member
  await page.getByPlaceholder(/Cari no WA/i).fill("member@ruangbabyhappy.com");
  await page.getByRole("button", { name: /^Cari$/ }).click();
  await page.getByRole("button", { name: /Member Contoh/ }).click();

  // anak
  await page.locator('input[name="anak_nama"]').fill("Bayi Trx");
  await page.locator('input[name="anak_bb"]').fill("3.0");
  await page.locator('select[name="anak_jk"]').selectOption("L");

  // qty 2 pada produk pertama
  await page.locator('section:has-text("Produk") input[type="number"]').first().fill("2");

  // status lunas
  await page.locator('select[name="status"]').selectOption("lunas");

  await page.getByRole("button", { name: /Simpan Transaksi/i }).click();
  await expect(page).toHaveURL(/\/admin\/transaksi\/RBH-/);
  kode = (page.url().match(/RBH-[A-Z0-9-]+/) ?? [""])[0];
  await expect(page.getByText(/Item/)).toBeVisible();

  const inv = await page.request.get(`/invoice/${kode}`);
  expect(inv.headers()["content-type"]).toContain("application/pdf");
});
```

- [ ] **Step 2:** `npm run test` hijau · **Step 3:** `npm run build` hijau (route `/admin/transaksi/baru`) · **Step 4:** `npm run test:e2e -- transaksi-admin smoke` hijau (kill zombie port dulu). **Step 5:** commit spec.

---

## Langkah Manual (user)
Jalankan `supabase/migrations/0005_booking_item.sql` di SQL Editor.

## Self-Review (vs permintaan 1–15)
1 tombol New Transaksi ✓ · 2 search WA/nama ✓ · 3 data customer muncul ✓ · 4 pilih sesi ✓ · 5 multi produk ✓ · 6 input jumlah ✓ · 7 tanggal default hari ini + bisa pilih ✓ · 8 customer baru → akun member ✓ · 9 studio/home + akomodasi zona ✓ · 10 jumlah item + total ✓ · 11 DP + diskon ✓ · 12 status bayar + pengerjaan ✓ · 13 simpan ✓ · 14 invoice (di detail, multi-item) ✓ · 15 kirim WA (tombol di detail) ✓.
Kapasitas tak diblok (admin otoritatif). Member flow & data lama tetap kompatibel.
