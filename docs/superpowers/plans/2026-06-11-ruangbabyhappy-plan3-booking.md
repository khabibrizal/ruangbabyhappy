# Ruang Baby Happy — Plan 3: Booking + Bayar + Ongkos + Diskon Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development atau superpowers:executing-plans. Steps pakai checkbox (`- [ ]`).

**Goal:** Member yang login bisa booking end-to-end: pilih tanggal + sesi (kapasitas per layanan), isi data anak, pilih lokasi (Di Studio / Home Service + zona + alamat), lihat **rincian total live** (paket + ongkos − diskon, DP `dp_persen`%), upload bukti TF, lalu dapat halaman konfirmasi dengan tombol Chat Admin WA per layanan.

**Architecture:** Lanjutan Plan 1–2. Fungsi hitung murni (TDD). `buatBooking` Server Action (service-role, multipart) meng-gate login, validasi sesi ulang, hitung ongkos/diskon/DP, upload bukti, insert booking+payment. Halaman detail paket = server (gate login) + komponen client interaktif (fetch sesi via API, rincian total reaktif). Konfirmasi by-kode.

**Tech Stack:** Next.js 16 (server actions + client components), Supabase Storage (`bukti-tf` privat), Vitest, Playwright.

**Prasyarat:** Plan 2 selesai (commit ...0530750). `getPackageById`, `getSesiTersedia` sudah ada. Butuh **bucket Storage `bukti-tf`** (Task 7 Step 1 membuatnya). Dev login member: `member@ruangbabyhappy.com` / `Member12345!`.

---

## File Structure (Plan 3)

```
src/lib/booking/hitung.ts                  # hitungDiskon, hitungTagihan, hitungDp (murni, TDD)
src/lib/booking/kode.ts                    # buildKodeBooking (RBH-...) + randomSuffix
src/lib/booking/waLink.ts                  # buildWaLink + normalisasiWa
src/lib/booking/queries.ts                 # getBookingByKode (konfirmasi)
src/lib/catalog/queries.ts                 # (+ getZonaAktif)
src/lib/booking/createBooking.ts           # Server Action buatBooking
src/app/api/sesi/route.ts                  # GET ketersediaan sesi
src/app/paket/[id]/page.tsx                # detail paket (gate login) + render BookingForm
src/app/paket/[id]/BookingForm.tsx         # client: tanggal+sesi+anak+lokasi+total+bukti
src/app/booking/[kode]/page.tsx            # konfirmasi
tests/unit/hitung.test.ts
tests/unit/kode.test.ts
tests/e2e/booking.spec.ts
```

---

## Task 1: Fungsi hitung (TDD) + kode booking

**Files:**
- Create: `src/lib/booking/hitung.ts`, `src/lib/booking/kode.ts`
- Test: `tests/unit/hitung.test.ts`, `tests/unit/kode.test.ts`

- [ ] **Step 1: Tulis test gagal `tests/unit/hitung.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { hitungDiskon, hitungTagihan, hitungDp } from "@/lib/booking/hitung";

describe("hitungDiskon", () => {
  it("member returning -> nilai diskon paket", () => {
    expect(hitungDiskon({ returning: true, diskonReturning: 50000 })).toBe(50000);
  });
  it("bukan returning -> 0", () => {
    expect(hitungDiskon({ returning: false, diskonReturning: 50000 })).toBe(0);
  });
});

describe("hitungTagihan", () => {
  it("paket + ongkos - diskon", () => {
    expect(hitungTagihan({ harga: 1000000, ongkos: 100000, diskon: 50000 })).toBe(1050000);
  });
  it("studio (ongkos 0), tanpa diskon", () => {
    expect(hitungTagihan({ harga: 750000, ongkos: 0, diskon: 0 })).toBe(750000);
  });
});

describe("hitungDp", () => {
  it("30% dari tagihan, dibulatkan", () => {
    expect(hitungDp(1050000, 30)).toBe(315000);
    expect(hitungDp(750000, 30)).toBe(225000);
  });
  it("persen lain", () => {
    expect(hitungDp(1000000, 50)).toBe(500000);
  });
  it("pembulatan", () => {
    expect(hitungDp(100001, 30)).toBe(30000); // 30000.3 -> 30000
  });
});
```

- [ ] **Step 2: Jalankan, pastikan GAGAL**

Run: `npm run test -- hitung`
Expected: FAIL — `Cannot find module '@/lib/booking/hitung'`.

- [ ] **Step 3: `src/lib/booking/hitung.ts`**

```ts
/** Diskon pelanggan lama: member returning -> nilai diskon paket; selain itu 0. */
export function hitungDiskon(opts: { returning: boolean; diskonReturning: number }): number {
  return opts.returning ? opts.diskonReturning : 0;
}

/** Tagihan (grand total) = harga paket + ongkos home service − diskon. */
export function hitungTagihan(opts: { harga: number; ongkos: number; diskon: number }): number {
  return opts.harga + opts.ongkos - opts.diskon;
}

/** DP = persen × tagihan, dibulatkan ke rupiah terdekat. */
export function hitungDp(tagihan: number, dpPersen: number): number {
  return Math.round((tagihan * dpPersen) / 100);
}
```

- [ ] **Step 4: Jalankan, pastikan LULUS**

Run: `npm run test -- hitung`
Expected: PASS (7 assertion / 6 test).

- [ ] **Step 5: Tulis test gagal `tests/unit/kode.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { buildKodeBooking } from "@/lib/booking/kode";

describe("buildKodeBooking", () => {
  it("format RBH-<tgl tanpa strip>-<suffix uppercase>", () => {
    expect(buildKodeBooking("2026-07-21", "ab12")).toBe("RBH-20260721-AB12");
  });
});
```

- [ ] **Step 6: Jalankan, pastikan GAGAL**

Run: `npm run test -- kode`
Expected: FAIL — module belum ada.

- [ ] **Step 7: `src/lib/booking/kode.ts`**

```ts
/** Bentuk kode booking deterministik: RBH-20260721-AB12. Suffix di-uppercase. */
export function buildKodeBooking(tanggal: string, suffix: string): string {
  return `RBH-${tanggal.replaceAll("-", "")}-${suffix.toUpperCase()}`;
}

/** Suffix acak 4 karakter (dipakai server; tidak murni sehingga tak di-unit-test). */
export function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 6);
}
```

- [ ] **Step 8: Jalankan, pastikan LULUS**

Run: `npm run test -- kode`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/lib/booking/hitung.ts src/lib/booking/kode.ts tests/unit/hitung.test.ts tests/unit/kode.test.ts
git commit -m "feat(booking): hitungDiskon/Tagihan/Dp + buildKodeBooking (TDD)"
```

---

## Task 2: waLink, query zona, query booking konfirmasi

**Files:**
- Create: `src/lib/booking/waLink.ts`, `src/lib/booking/queries.ts`
- Modify: `src/lib/catalog/queries.ts` (tambah `getZonaAktif`)

- [ ] **Step 1: `src/lib/booking/waLink.ts`**

```ts
type WaInfo = { kode: string; layanan: string; paket: string; tanggal: string; sesi: string };

/** Normalisasi nomor WA Indonesia ke format internasional tanpa '+': 0xxx -> 62xxx. */
export function normalisasiWa(no: string): string {
  const digits = (no ?? "").replace(/\D/g, "");
  if (digits.startsWith("0")) return "62" + digits.slice(1);
  return digits;
}

/** Bangun tautan wa.me berisi template konfirmasi booking ke nomor admin layanan. */
export function buildWaLink(adminPhone: string, info: WaInfo): string {
  const teks =
    `Halo Admin Ruang Baby Happy, saya mau konfirmasi booking:\n` +
    `Kode: ${info.kode}\n` +
    `Layanan: ${info.layanan}\n` +
    `Paket: ${info.paket}\n` +
    `Tanggal: ${info.tanggal} (${info.sesi})\n` +
    `Bukti transfer sudah saya upload. Mohon diverifikasi, terima kasih.`;
  return `https://wa.me/${normalisasiWa(adminPhone)}?text=${encodeURIComponent(teks)}`;
}
```

- [ ] **Step 2: Tambah `getZonaAktif` di `src/lib/catalog/queries.ts`** — sisipkan di akhir file:

```ts
export type ZonaOpsi = { id: string; nama: string; keterangan: string | null; biaya: number };

/** Zona ongkos aktif (urut) untuk pilihan home service di form booking. */
export async function getZonaAktif(): Promise<ZonaOpsi[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("zona_ongkos")
    .select("id, nama, keterangan, biaya")
    .eq("is_active", true)
    .order("urutan");
  return (data as ZonaOpsi[]) ?? [];
}
```

- [ ] **Step 3: `src/lib/booking/queries.ts`** (konfirmasi by kode)

```ts
import { createAdminClient } from "@/lib/supabase/admin";

export type BookingKonfirmasi = {
  kode_booking: string;
  tanggal: string;
  jam_mulai: string;
  anak_nama: string;
  anak_bb: number;
  anak_jk: string;
  lokasi_sesi: string;
  alamat_sesi: string | null;
  sesi: { nama: string } | null;
  zona: { nama: string } | null;
  package: { nama: string; durasi_menit: number } | null;
  layanan_nama: string;
  layanan_admin_wa: string;
  payment: { status_bayar: string; total: number; ongkos: number; diskon: number; dp_amount: number | null } | null;
};

/** Ambil booking berdasarkan kode (service-role; kode = token kapabilitas). */
export async function getBookingByKode(kode: string): Promise<BookingKonfirmasi | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("booking")
    .select(
      "kode_booking, tanggal, jam_mulai, anak_nama, anak_bb, anak_jk, lokasi_sesi, alamat_sesi, " +
        "sesi:sesi_id(nama), zona:zona_id(nama), " +
        "package:package_id(nama, durasi_menit, layanan:layanan_id(nama, admin_wa)), " +
        "payment(status_bayar, total, ongkos, diskon, dp_amount)",
    )
    .eq("kode_booking", kode)
    .maybeSingle();
  if (!data) return null;

  const pkg = data.package as unknown as
    | { nama: string; durasi_menit: number; layanan: { nama: string; admin_wa: string } | null }
    | null;

  return {
    kode_booking: data.kode_booking as string,
    tanggal: data.tanggal as string,
    jam_mulai: data.jam_mulai as string,
    anak_nama: data.anak_nama as string,
    anak_bb: data.anak_bb as number,
    anak_jk: data.anak_jk as string,
    lokasi_sesi: data.lokasi_sesi as string,
    alamat_sesi: (data.alamat_sesi as string) ?? null,
    sesi: (data.sesi as unknown as { nama: string }) ?? null,
    zona: (data.zona as unknown as { nama: string }) ?? null,
    package: pkg ? { nama: pkg.nama, durasi_menit: pkg.durasi_menit } : null,
    layanan_nama: pkg?.layanan?.nama ?? "",
    layanan_admin_wa: pkg?.layanan?.admin_wa ?? "",
    payment: (data.payment as unknown as BookingKonfirmasi["payment"]) ?? null,
  };
}
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/booking/waLink.ts src/lib/booking/queries.ts src/lib/catalog/queries.ts
git commit -m "feat(booking): waLink (routing layanan), getZonaAktif, getBookingByKode"
```

---

## Task 3: Server Action buatBooking

**Files:**
- Create: `src/lib/booking/createBooking.ts`

- [ ] **Step 1: `src/lib/booking/createBooking.ts`**

```ts
"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { getSesiTersedia } from "./sesiAvailability";
import { buildKodeBooking, randomSuffix } from "./kode";
import { hitungDiskon, hitungTagihan, hitungDp } from "./hitung";

function extDari(type: string): string {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "jpg";
}

export async function buatBooking(formData: FormData) {
  const packageId = String(formData.get("packageId") ?? "");
  const back = (msg: string) => redirect(`/paket/${packageId}?error=${encodeURIComponent(msg)}`);

  // 0. Wajib login (member).
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const tanggal = String(formData.get("tanggal") ?? "");
  const sesiId = String(formData.get("sesiId") ?? "");
  const anakNama = String(formData.get("anak_nama") ?? "").trim();
  const anakBb = Number(formData.get("anak_bb") ?? 0);
  const anakJk = String(formData.get("anak_jk") ?? "");
  const lokasi = String(formData.get("lokasi_sesi") ?? "home");
  const zonaId = String(formData.get("zonaId") ?? "");
  const alamatSesi = String(formData.get("alamat_sesi") ?? "").trim();

  if (!packageId || !tanggal || !sesiId) back("Data belum lengkap");
  if (!anakNama || !anakBb || (anakJk !== "L" && anakJk !== "P")) back("Data anak belum lengkap");
  if (lokasi === "home" && (!zonaId || !alamatSesi)) back("Zona & alamat home service wajib diisi");

  // 1. Bukti TF wajib (gambar, <=5MB).
  const file = formData.get("bukti");
  if (!(file instanceof File) || file.size === 0) back("Bukti transfer wajib diupload");
  const bukti = file as File;
  if (!bukti.type.startsWith("image/")) back("Bukti harus berupa gambar");
  if (bukti.size > 5_000_000) back("Ukuran bukti maksimal 5MB");

  const admin = createAdminClient();

  // 2. Validasi sesi ULANG (kapasitas per layanan).
  const sesiTersedia = await getSesiTersedia(packageId, tanggal);
  const sesiDipilih = sesiTersedia.find((s) => s.id === sesiId);
  if (!sesiDipilih) back("Sesi sudah tidak tersedia");

  // 3. Paket -> harga, dp_persen, diskon_returning.
  const { data: paket } = await admin
    .from("package")
    .select("harga, dp_persen, diskon_returning")
    .eq("id", packageId)
    .single();
  if (!paket) back("Paket tidak ditemukan");

  // 4. Ongkos dari zona (0 bila studio).
  let ongkos = 0;
  if (lokasi === "home") {
    const { data: zona } = await admin.from("zona_ongkos").select("biaya").eq("id", zonaId).single();
    ongkos = (zona?.biaya as number) ?? 0;
  }

  // 5. Returning? (member punya >=1 booking lunas).
  const { count } = await admin
    .from("booking")
    .select("id, payment!inner(status_bayar)", { count: "exact", head: true })
    .eq("customer_profile_id", profile!.id)
    .eq("payment.status_bayar", "lunas");
  const returning = (count ?? 0) > 0;

  const diskon = hitungDiskon({ returning, diskonReturning: paket!.diskon_returning as number });
  const total = paket!.harga as number;
  const tagihan = hitungTagihan({ harga: total, ongkos, diskon });
  const dp = hitungDp(tagihan, paket!.dp_persen as number);

  const kode = buildKodeBooking(tanggal, randomSuffix());

  // 6. Upload bukti (service-role).
  const path = `bukti/${kode}.${extDari(bukti.type)}`;
  const { error: upErr } = await admin.storage
    .from("bukti-tf")
    .upload(path, await bukti.arrayBuffer(), { contentType: bukti.type, upsert: true });
  if (upErr) back("Gagal upload bukti: " + upErr.message);

  // 7. Insert booking (pending) milik member.
  const { data: booking, error } = await admin
    .from("booking")
    .insert({
      kode_booking: kode,
      package_id: packageId,
      sesi_id: sesiId,
      customer_profile_id: profile!.id,
      anak_nama: anakNama,
      anak_bb: anakBb,
      anak_jk: anakJk,
      lokasi_sesi: lokasi,
      zona_id: lokasi === "home" ? zonaId : null,
      alamat_sesi: lokasi === "home" ? alamatSesi : null,
      tanggal,
      jam_mulai: sesiDipilih!.jam_mulai,
      status_booking: "pending",
    })
    .select("id")
    .single();
  if (error || !booking) back(error?.message ?? "Gagal booking");

  // 8. Insert payment (unpaid + total/ongkos/diskon/dp + bukti).
  await admin.from("payment").insert({
    booking_id: booking!.id,
    total,
    ongkos,
    diskon,
    dp_amount: dp,
    status_bayar: "unpaid",
    bukti_url: path,
  });

  redirect(`/booking/${kode}`);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/booking/createBooking.ts
git commit -m "feat(booking): buatBooking (gate login, validasi sesi, ongkos+diskon+DP, upload bukti)"
```

---

## Task 4: API ketersediaan sesi

**Files:**
- Create: `src/app/api/sesi/route.ts`

- [ ] **Step 1: `src/app/api/sesi/route.ts`**

```ts
import { NextResponse } from "next/server";
import { getSesiTersedia } from "@/lib/booking/sesiAvailability";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const paket = searchParams.get("paket");
  const tanggal = searchParams.get("tanggal");
  if (!paket || !tanggal || !/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) {
    return NextResponse.json({ error: "param paket & tanggal (YYYY-MM-DD) wajib" }, { status: 400 });
  }
  const sesi = await getSesiTersedia(paket, tanggal);
  return NextResponse.json({ sesi });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/sesi/route.ts
git commit -m "feat(api): GET /api/sesi ketersediaan sesi per paket+tanggal"
```

---

## Task 5: Halaman detail paket (gate login) + BookingForm

**Files:**
- Create: `src/app/paket/[id]/page.tsx`, `src/app/paket/[id]/BookingForm.tsx`

- [ ] **Step 1: `src/app/paket/[id]/page.tsx`** (server; gate login; siapkan data utk client)

```tsx
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import PublicShell from "@/components/public/PublicShell";
import { getPackageById, getZonaAktif } from "@/lib/catalog/queries";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatRupiah } from "@/lib/format/rupiah";
import BookingForm from "./BookingForm";

export const dynamic = "force-dynamic";

export default async function PaketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const profile = await getCurrentProfile();
  if (!profile) redirect(`/login?error=${encodeURIComponent("Silakan masuk dulu untuk booking")}`);

  const paket = await getPackageById(id);
  if (!paket) notFound();

  const zona = await getZonaAktif();

  // Returning? (member punya >=1 booking lunas) -> diskon otomatis.
  const admin = createAdminClient();
  const { count } = await admin
    .from("booking")
    .select("id, payment!inner(status_bayar)", { count: "exact", head: true })
    .eq("customer_profile_id", profile!.id)
    .eq("payment.status_bayar", "lunas");
  const returning = (count ?? 0) > 0;

  return (
    <PublicShell>
      <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
        <Link href="/" className="text-sm text-foreground/50 underline">← Kembali</Link>
        <span className="mt-3 inline-block rounded-full bg-white px-3 py-1 text-xs font-extrabold text-pink-500 shadow-sm">
          {paket.layanan_nama}
        </span>
        <h1 className="mt-2 font-display text-2xl font-extrabold">{paket.nama}</h1>
        {paket.deskripsi && <p className="mt-1 text-foreground/60">{paket.deskripsi}</p>}
        <p className="mt-2 font-display text-2xl font-extrabold text-pink-500">{formatRupiah(paket.harga)}</p>
        <p className="text-xs text-foreground/45">±{paket.durasi_menit} menit · DP {paket.dp_persen}%</p>

        <BookingForm
          packageId={paket.id}
          harga={paket.harga}
          dpPersen={paket.dp_persen}
          diskonReturning={paket.diskon_returning}
          returning={returning}
          zona={zona}
        />
      </main>
    </PublicShell>
  );
}
```

- [ ] **Step 2: `src/app/paket/[id]/BookingForm.tsx`** (client interaktif + rincian total)

```tsx
"use client";
import { useState } from "react";
import { buatBooking } from "@/lib/booking/createBooking";
import { btnGrad } from "@/components/ui/buttons";
import { formatRupiah } from "@/lib/format/rupiah";
import { hitungDiskon, hitungTagihan, hitungDp } from "@/lib/booking/hitung";

type SesiOpsi = { id: string; nama: string; jam_mulai: string };
type ZonaOpsi = { id: string; nama: string; keterangan: string | null; biaya: number };

const inp = "rounded-xl bg-white px-3 py-2.5 text-sm ring-1 ring-black/10";

export default function BookingForm({
  packageId,
  harga,
  dpPersen,
  diskonReturning,
  returning,
  zona,
}: {
  packageId: string;
  harga: number;
  dpPersen: number;
  diskonReturning: number;
  returning: boolean;
  zona: ZonaOpsi[];
}) {
  const [tanggal, setTanggal] = useState("");
  const [sesiList, setSesiList] = useState<SesiOpsi[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [sesiId, setSesiId] = useState("");
  const [lokasi, setLokasi] = useState<"studio" | "home">("home");
  const [zonaId, setZonaId] = useState("");

  async function cekSesi(tgl: string) {
    setTanggal(tgl);
    setSesiId("");
    if (!tgl) return setSesiList(null);
    setLoading(true);
    const res = await fetch(`/api/sesi?paket=${packageId}&tanggal=${tgl}`);
    const json = await res.json();
    setSesiList(json.sesi ?? []);
    setLoading(false);
  }

  const ongkos = lokasi === "home" ? (zona.find((z) => z.id === zonaId)?.biaya ?? 0) : 0;
  const diskon = hitungDiskon({ returning, diskonReturning });
  const total = hitungTagihan({ harga, ongkos, diskon });
  const dp = hitungDp(total, dpPersen);
  const bisaSubmit = !!sesiId && (lokasi === "studio" || (!!zonaId));

  return (
    <form action={buatBooking} className="mt-6 flex flex-col gap-4">
      <input type="hidden" name="packageId" value={packageId} />
      <input type="hidden" name="sesiId" value={sesiId} />

      {/* Tanggal */}
      <div>
        <label className="text-sm font-bold">📅 Tanggal</label>
        <input type="date" name="tanggal" value={tanggal} required
          onChange={(e) => cekSesi(e.target.value)} className={`mt-1 block w-full ${inp}`} />
      </div>

      {/* Sesi */}
      {loading && <p className="text-sm text-foreground/50">Memuat sesi…</p>}
      {!loading && sesiList && sesiList.length === 0 && (
        <p className="text-sm text-foreground/50">Tidak ada sesi tersedia pada tanggal ini.</p>
      )}
      {!loading && sesiList && sesiList.length > 0 && (
        <div>
          <label className="text-sm font-bold">⏰ Pilih Sesi</label>
          <div className="mt-1 grid grid-cols-2 gap-2">
            {sesiList.map((s) => (
              <button key={s.id} type="button" onClick={() => setSesiId(s.id)}
                className={`rounded-2xl p-3 text-center text-sm font-bold ring-1 transition ${
                  sesiId === s.id ? "bg-grad text-white ring-transparent" : "bg-white ring-black/10"
                }`}>
                {s.nama} · {s.jam_mulai.slice(0, 5)}
              </button>
            ))}
          </div>
        </div>
      )}

      {sesiId && (
        <>
          {/* Data anak */}
          <div className="rounded-2xl bg-white/60 p-3">
            <div className="text-sm font-bold">🍼 Data Anak</div>
            <input name="anak_nama" placeholder="Nama anak" className={`mt-2 block w-full ${inp}`} required />
            <div className="mt-2 grid grid-cols-2 gap-2">
              <input name="anak_bb" type="number" step="0.1" min="0" placeholder="Berat badan (kg)" className={inp} required />
              <select name="anak_jk" className={inp} required defaultValue="">
                <option value="" disabled>Jenis kelamin</option>
                <option value="L">Laki-laki</option>
                <option value="P">Perempuan</option>
              </select>
            </div>
          </div>

          {/* Lokasi */}
          <div>
            <label className="text-sm font-bold">📍 Lokasi Sesi</label>
            <div className="mt-1 grid grid-cols-2 gap-2">
              <label className={`cursor-pointer rounded-2xl p-3 text-center text-sm font-bold ring-1 ${lokasi === "studio" ? "bg-grad text-white ring-transparent" : "bg-white ring-black/10"}`}>
                <input type="radio" name="lokasi_sesi" value="studio" className="hidden"
                  checked={lokasi === "studio"} onChange={() => setLokasi("studio")} />
                Di Studio
              </label>
              <label className={`cursor-pointer rounded-2xl p-3 text-center text-sm font-bold ring-1 ${lokasi === "home" ? "bg-grad text-white ring-transparent" : "bg-white ring-black/10"}`}>
                <input type="radio" name="lokasi_sesi" value="home" className="hidden"
                  checked={lokasi === "home"} onChange={() => setLokasi("home")} />
                Home Service
              </label>
            </div>
            {lokasi === "home" && (
              <div className="mt-2 flex flex-col gap-2">
                <select name="zonaId" value={zonaId} onChange={(e) => setZonaId(e.target.value)} className={inp} required>
                  <option value="" disabled>Pilih zona…</option>
                  {zona.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.nama}{z.keterangan ? ` (${z.keterangan})` : ""} — {formatRupiah(z.biaya)}
                    </option>
                  ))}
                </select>
                <textarea name="alamat_sesi" rows={2} placeholder="Alamat lengkap home service" className={inp} required />
              </div>
            )}
          </div>

          {/* Rincian total */}
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-pink-100">
            <div className="text-sm font-bold">💰 Rincian Pembayaran</div>
            <div className="mt-2 space-y-1.5 text-sm font-semibold">
              <div className="flex justify-between"><span className="text-foreground/60">Paket</span><span>{formatRupiah(harga)}</span></div>
              {lokasi === "home" && (
                <div className="flex justify-between"><span className="text-foreground/60">Home Service</span><span>{formatRupiah(ongkos)}</span></div>
              )}
              {diskon > 0 && (
                <div className="flex justify-between text-emerald-600"><span>Diskon pelanggan lama</span><span>−{formatRupiah(diskon)}</span></div>
              )}
              <div className="border-t border-dashed border-black/10 my-1.5" />
              <div className="flex justify-between text-base font-extrabold"><span>Total</span><span className="text-grad">{formatRupiah(total)}</span></div>
              <div className="flex justify-between text-pink-500 font-bold"><span>DP ({dpPersen}%)</span><span>{formatRupiah(dp)}</span></div>
              <div className="flex justify-between text-xs text-foreground/50"><span>Sisa saat hari-H</span><span>{formatRupiah(total - dp)}</span></div>
            </div>
          </div>

          {/* Bukti */}
          <label className="text-sm font-bold">🧾 Bukti Transfer (wajib)
            <input name="bukti" type="file" accept="image/*" required
              className="mt-1 block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-pink-100 file:px-4 file:py-2 file:font-bold file:text-pink-600" />
          </label>

          <button className={`${btnGrad} w-full`} disabled={!bisaSubmit}>Buat Booking 🎀</button>
        </>
      )}
    </form>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add "src/app/paket/[id]/page.tsx" "src/app/paket/[id]/BookingForm.tsx"
git commit -m "feat(booking): halaman detail paket (gate login) + BookingForm (sesi/anak/home service/rincian total)"
```

---

## Task 6: Halaman konfirmasi `/booking/[kode]`

**Files:**
- Create: `src/app/booking/[kode]/page.tsx`

- [ ] **Step 1: `src/app/booking/[kode]/page.tsx`**

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import PublicShell from "@/components/public/PublicShell";
import { getBookingByKode } from "@/lib/booking/queries";
import { buildWaLink } from "@/lib/booking/waLink";
import { formatRupiah } from "@/lib/format/rupiah";

const LABEL: Record<string, string> = { unpaid: "Belum bayar", dp_paid: "DP terbayar", lunas: "Lunas" };

export default async function KonfirmasiPage({
  params,
}: {
  params: Promise<{ kode: string }>;
}) {
  const { kode } = await params;
  const b = await getBookingByKode(kode);
  if (!b) notFound();

  const status = b.payment?.status_bayar ?? "unpaid";
  const total = b.payment?.total ?? 0;
  const tagihan = total + (b.payment?.ongkos ?? 0) - (b.payment?.diskon ?? 0);
  const dp = b.payment?.dp_amount ?? 0;

  const waUrl = buildWaLink(b.layanan_admin_wa, {
    kode: b.kode_booking,
    layanan: b.layanan_nama,
    paket: b.package?.nama ?? "-",
    tanggal: b.tanggal,
    sesi: b.sesi?.nama ?? "",
  });

  return (
    <PublicShell>
      <main className="grad-soft min-h-[70vh]">
        <div className="mx-auto w-full max-w-md px-4 py-12 sm:px-6">
          <h1 className="font-display text-2xl font-extrabold">Booking Diterima 🎉</h1>
          <p className="mt-1 text-sm font-semibold text-foreground/60">
            Bukti transfer terkirim & menunggu verifikasi admin. Simpan kode ini.
          </p>

          <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
            <p className="font-display text-2xl font-extrabold text-grad">{b.kode_booking}</p>
            <dl className="mt-3 grid grid-cols-2 gap-y-1.5 text-sm font-semibold">
              <dt className="text-foreground/50">Layanan</dt><dd className="text-right">{b.layanan_nama}</dd>
              <dt className="text-foreground/50">Paket</dt><dd className="text-right">{b.package?.nama ?? "-"}</dd>
              <dt className="text-foreground/50">Jadwal</dt><dd className="text-right">{b.tanggal} · {b.sesi?.nama}</dd>
              <dt className="text-foreground/50">Lokasi</dt><dd className="text-right">{b.lokasi_sesi === "home" ? `Home${b.zona ? ` · ${b.zona.nama}` : ""}` : "Di Studio"}</dd>
              <dt className="text-foreground/50">Anak</dt><dd className="text-right">{b.anak_nama} · {b.anak_bb}kg · {b.anak_jk}</dd>
            </dl>
            <div className="mt-3 border-t border-dashed border-black/10 pt-2 text-sm font-semibold">
              <div className="flex justify-between"><span className="text-foreground/50">Paket</span><span>{formatRupiah(total)}</span></div>
              {(b.payment?.ongkos ?? 0) > 0 && <div className="flex justify-between"><span className="text-foreground/50">Home Service</span><span>{formatRupiah(b.payment?.ongkos)}</span></div>}
              {(b.payment?.diskon ?? 0) > 0 && <div className="flex justify-between text-emerald-600"><span>Diskon</span><span>−{formatRupiah(b.payment?.diskon)}</span></div>}
              <div className="flex justify-between font-extrabold"><span>Total</span><span>{formatRupiah(tagihan)}</span></div>
              <div className="flex justify-between text-pink-500"><span>DP — transfer</span><span className="font-bold">{formatRupiah(dp)}</span></div>
              <div className="flex justify-between"><span className="text-foreground/50">Status</span><span>{LABEL[status] ?? status}</span></div>
            </div>
          </div>

          <a href={waUrl} target="_blank" rel="noopener noreferrer"
            className="mt-4 flex h-12 items-center justify-center rounded-full bg-green-500 px-4 font-bold text-white shadow-lg hover:bg-green-600">
            💬 Chat Admin via WA
          </a>
          <Link href="/member" className="mt-3 block text-center text-sm font-semibold text-foreground/50 underline">
            Lihat di dashboard saya
          </Link>
        </div>
      </main>
    </PublicShell>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "src/app/booking/[kode]/page.tsx"
git commit -m "feat(booking): halaman konfirmasi /booking/[kode] + Chat Admin WA per layanan"
```

---

## Task 7: Bucket Storage + E2E + verifikasi

**Files:**
- Create: `tests/e2e/booking.spec.ts`

- [ ] **Step 1: Buat bucket Storage `bukti-tf` (privat) via REST** — jalankan (ganti `<URL>` & `<SERVICE_KEY>` dari `.env.local`; di mesin ini `.env.local` sudah ada):

```bash
cd /d/ruangbabyhappy
URL=$(grep NEXT_PUBLIC_SUPABASE_URL .env.local | cut -d= -f2)
KEY=$(grep SUPABASE_SERVICE_ROLE_KEY .env.local | cut -d= -f2)
curl -s -X POST "$URL/storage/v1/bucket" -H "apikey: $KEY" -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" -d '{"id":"bukti-tf","name":"bukti-tf","public":false}'
echo
```
Expected: `{"name":"bukti-tf"}` atau (bila sudah ada) pesan duplicate — keduanya OK.

- [ ] **Step 2: `tests/e2e/booking.spec.ts`** (member booking penuh; butuh paket aktif — buat via REST, bersihkan setelah)

```ts
import { test, expect, request as pwRequest } from "@playwright/test";
import fs from "node:fs";

const MEMBER_EMAIL = "member@ruangbabyhappy.com";
const MEMBER_PASS = "Member12345!";

function env(k: string): string {
  const line = fs.readFileSync(".env.local", "utf8").split("\n").find((l) => l.startsWith(k + "="));
  return line ? line.slice(k.length + 1).trim() : "";
}
const URL = env("NEXT_PUBLIC_SUPABASE_URL");
const KEY = env("SUPABASE_SERVICE_ROLE_KEY");

let paketId = "";
let layananId = "";

test.beforeAll(async () => {
  const ctx = await pwRequest.newContext();
  // ambil 1 layanan
  const lres = await ctx.get(`${URL}/rest/v1/layanan?select=id&limit=1`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
  });
  layananId = (await lres.json())[0].id;
  // buat paket uji
  const pres = await ctx.post(`${URL}/rest/v1/package`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json", Prefer: "return=representation" },
    data: { layanan_id: layananId, nama: `E2E-PAKET-${Date.now()}`, harga: 1000000, durasi_menit: 60, dp_persen: 30, diskon_returning: 0 },
  });
  paketId = (await pres.json())[0].id;
  await ctx.dispose();
});

test.afterAll(async () => {
  const ctx = await pwRequest.newContext();
  // hapus booking uji (yang punya paket ini) lalu paket uji
  await ctx.delete(`${URL}/rest/v1/booking?package_id=eq.${paketId}`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
  });
  await ctx.delete(`${URL}/rest/v1/package?id=eq.${paketId}`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
  });
  await ctx.dispose();
});

async function loginMember(page) {
  await page.goto("/login");
  await page.getByPlaceholder("Email").fill(MEMBER_EMAIL);
  await page.getByPlaceholder("Password").fill(MEMBER_PASS);
  await page.getByRole("button", { name: /Masuk/i }).click();
  await expect(page).toHaveURL(/\/member/);
}

test("paket detail butuh login (redirect ke /login)", async ({ page }) => {
  await page.goto(`/paket/${paketId}`);
  await expect(page).toHaveURL(/\/login/);
});

test("member booking home service end-to-end", async ({ page }) => {
  await loginMember(page);
  await page.goto(`/paket/${paketId}`);

  // tanggal: 14 hari ke depan (hindari blackout/lampau)
  const d = new Date(); d.setDate(d.getDate() + 14);
  const tgl = d.toISOString().slice(0, 10);
  await page.locator('input[name="tanggal"]').fill(tgl);

  // pilih sesi pertama yang tersedia
  await page.getByRole("button", { name: /Sesi/i }).first().click();

  await page.locator('input[name="anak_nama"]').fill("Bayi E2E");
  await page.locator('input[name="anak_bb"]').fill("3.5");
  await page.locator('select[name="anak_jk"]').selectOption("P");

  // home service + zona pertama
  await page.locator('select[name="zonaId"]').selectOption({ index: 1 });
  await page.locator('textarea[name="alamat_sesi"]').fill("Jl. Uji No. 1");

  // rincian total tampil (Total + DP)
  await expect(page.getByText(/Total/).first()).toBeVisible();
  await expect(page.getByText(/DP \(30%\)/)).toBeVisible();

  // upload bukti (fixture dibuat on-the-fly)
  const buktiPath = "tests/e2e/_bukti.png";
  if (!fs.existsSync(buktiPath)) {
    fs.writeFileSync(buktiPath, Buffer.from("89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c6360000002000154a24f9b0000000049454e44ae426082", "hex"));
  }
  await page.locator('input[name="bukti"]').setInputFiles(buktiPath);

  await page.getByRole("button", { name: /Buat Booking/i }).click();

  await expect(page).toHaveURL(/\/booking\/RBH-/);
  await expect(page.getByText(/Booking Diterima/)).toBeVisible();
  await expect(page.getByRole("link", { name: /Chat Admin via WA/i })).toBeVisible();
});
```

> Catatan: fixture PNG 1×1 dibuat dari hex saat run pertama; tersimpan di `tests/e2e/_bukti.png` (boleh di-gitignore atau di-commit kecil). Booking uji dihapus di `afterAll`.

- [ ] **Step 3: Jalankan unit test penuh**

Run: `npm run test`
Expected: PASS (`rupiah`, `sesiAvailability`, `hitung`, `kode`).

- [ ] **Step 4: Verifikasi build** (hentikan dev server dulu bila berjalan, agar `.next` tak bentrok)

Run: `npm run build`
Expected: sukses; route `/paket/[id]`, `/booking/[kode]`, `/api/sesi` muncul. Ulangi bila Turbopack timeout transien.

- [ ] **Step 5: Jalankan E2E booking (+ regresi master & smoke)**

Run: `npm run test:e2e -- booking master smoke`
Expected: semua PASS (booking 2 test × 2 project + master 2×2 + smoke 3×2). Butuh dev server (Playwright start sendiri) + `.env.local` + bucket `bukti-tf`.

- [ ] **Step 6: Commit**

```bash
git add tests/e2e/booking.spec.ts
git commit -m "test(e2e): booking member end-to-end (home service, rincian total, konfirmasi)"
```

> Bila `tests/e2e/_bukti.png` tercipta & tak ingin di-commit, tambahkan ke `.gitignore`. (Opsional.)

---

## Self-Review (plan vs spec)

- **Wajib login (spec §1/§7):** `/paket/[id]` redirect ke `/login` bila belum login; `buatBooking` cek `getCurrentProfile` ✓. E2E "paket detail butuh login" ✓.
- **Field anak (spec §3.7/§7):** anak_nama/anak_bb/anak_jk wajib, divalidasi server ✓.
- **Sesi (spec §4):** pilih sesi dari `getSesiTersedia` (kapasitas per layanan), validasi ulang di server saat submit ✓.
- **Home service & ongkos (spec §5b):** lokasi studio/home; home → zona+alamat wajib; ongkos = zona.biaya (server-resolve), studio → 0 ✓.
- **Diskon returning (spec §5):** dihitung otomatis dari histori lunas member (`hitungDiskon`) ✓; override admin = Plan 4.
- **DP (spec §5b):** `hitungDp(total, dp_persen)` default 30%, total = paket+ongkos−diskon ✓.
- **Rincian total ke user (spec §5b):** breakdown live di BookingForm + tampil di konfirmasi ✓.
- **Routing WA per layanan (spec §6):** konfirmasi pakai `layanan.admin_wa` via `buildWaLink` ✓.
- **Upload bukti (spec §6):** wajib, gambar, ≤5MB, ke bucket `bukti-tf` ✓ (bucket dibuat Task 7 Step 1).
- **Tidak ada placeholder kode.** Semua fungsi/komponen lengkap. Tipe `SesiOpsi`/`ZonaOpsi`/`BookingKonfirmasi` konsisten lintas file. `getSesiTersedia` & `getPackageById` dari Plan 2 dipakai sesuai signature.
```
