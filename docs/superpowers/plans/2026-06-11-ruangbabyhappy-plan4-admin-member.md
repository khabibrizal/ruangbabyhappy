# Ruang Baby Happy — Plan 4: Admin Transaksi + Invoice + Status Pengerjaan + Dashboard Member + Laporan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development atau superpowers:executing-plans. Steps pakai checkbox (`- [ ]`).

**Goal:** Mengisi area admin & member. Admin: daftar+detail transaksi (verifikasi bayar/Set Lunas, override **ongkos & diskon** dgn DP dihitung ulang, reschedule paket/tanggal/sesi, atur **status pengerjaan**), invoice PDF, kirim invoice WA per layanan, laporan + CSV. Member: dashboard riwayat booking + **stepper status pengerjaan 5 tahap**.

**Architecture:** Lanjutan Plan 1–3. Query admin pakai service-role; query member pakai server client (RLS `booking_owner_select`). Aksi admin di-guard `role==='admin'`. Status pengerjaan = enum berurut (helper murni, TDD). Invoice via `@react-pdf/renderer` di route publik-by-kode. Tema admin/member **terang-fungsional**.

**Tech Stack:** Next.js 16, Supabase, @react-pdf/renderer, Vitest, Playwright.

**Prasyarat:** Plan 3 selesai (commit ...9f1540e). Dipakai ulang: `hitungDp` (`@/lib/booking/hitung`), `getSesiTersedia`, `normalisasiWa` (`@/lib/booking/waLink`), `listSesi`/`getActivePackages`-equivalent. Akun: admin `admin@ruangbabyhappy.com`/`Admin12345!`, member `member@ruangbabyhappy.com`/`Member12345!`.

> **GOTCHA E2E (dari Plan 3):** Playwright tak punya `getByDisplayValue` (pakai `input[value="..."]`); secret key `sb_secret_*` ditolak 401 dari UA browser → `pwRequest.newContext({ userAgent: "rbh-e2e-setup" })`; cast hasil nested-select PostgREST (`data as unknown as {...}`); build Turbopack kadang timeout transien (ulangi); kill zombie dev server di port 3000/3001 sebelum E2E/build.

---

## File Structure (Plan 4)

```
src/lib/booking/statusPengerjaan.ts        # TAHAP_PENGERJAAN + LABEL + indexTahap (TDD)
src/lib/member/queries.ts                  # getMyBookings (own; + stepper data)
src/app/member/page.tsx                    # (ganti) dashboard + stepper
src/app/member/Stepper.tsx                 # komponen stepper (server)
src/lib/booking/queries.ts                 # (+ listTransaksiAdmin, getDetailTransaksi)
src/lib/booking/adminPayment.ts            # simpanDetailTransaksi, updateStatusPengerjaan, rescheduleBooking
src/app/admin/transaksi/page.tsx           # daftar transaksi (filter+pagination)
src/app/admin/transaksi/[kode]/page.tsx    # detail + form bayar/status/reschedule + invoice
src/app/admin/transaksi/[kode]/KirimInvoiceWA.tsx
src/lib/invoice/InvoiceDocument.tsx        # PDF Baby Happy
src/app/invoice/[kode]/route.ts            # render PDF
src/lib/report/aggregate.ts                # rekapPendapatan (TDD)
src/lib/report/csv.ts                      # toCSV
src/lib/report/queries.ts                  # getLaporan
src/app/admin/laporan/page.tsx
src/app/admin/laporan/csv/route.ts
src/app/admin/page.tsx                      # (ganti) link Transaksi + Laporan
tests/unit/statusPengerjaan.test.ts
tests/unit/reportAggregate.test.ts
tests/e2e/admin-transaksi.spec.ts
```

---

## Task 1: Helper status pengerjaan (TDD) + member queries

**Files:**
- Create: `src/lib/booking/statusPengerjaan.ts`, `src/lib/member/queries.ts`
- Test: `tests/unit/statusPengerjaan.test.ts`

- [ ] **Step 1: Tulis test gagal `tests/unit/statusPengerjaan.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { TAHAP_PENGERJAAN, LABEL_PENGERJAAN, indexTahap } from "@/lib/booking/statusPengerjaan";

describe("statusPengerjaan", () => {
  it("5 tahap berurutan", () => {
    expect(TAHAP_PENGERJAAN).toEqual(["pilih_foto", "edit", "cetak", "pengiriman", "selesai"]);
  });
  it("label ramah", () => {
    expect(LABEL_PENGERJAAN.pilih_foto).toBe("Pilih Foto");
    expect(LABEL_PENGERJAAN.selesai).toBe("Selesai");
  });
  it("indexTahap: null -> -1 (belum mulai)", () => {
    expect(indexTahap(null)).toBe(-1);
  });
  it("indexTahap: tahap -> posisi", () => {
    expect(indexTahap("pilih_foto")).toBe(0);
    expect(indexTahap("edit")).toBe(1);
    expect(indexTahap("selesai")).toBe(4);
  });
  it("indexTahap: tak dikenal -> -1", () => {
    expect(indexTahap("xxx")).toBe(-1);
  });
});
```

- [ ] **Step 2: Jalankan, pastikan GAGAL**

Run: `npm run test -- statusPengerjaan`
Expected: FAIL — module belum ada.

- [ ] **Step 3: `src/lib/booking/statusPengerjaan.ts`**

```ts
export const TAHAP_PENGERJAAN = ["pilih_foto", "edit", "cetak", "pengiriman", "selesai"] as const;
export type TahapPengerjaan = (typeof TAHAP_PENGERJAAN)[number];

export const LABEL_PENGERJAAN: Record<TahapPengerjaan, string> = {
  pilih_foto: "Pilih Foto",
  edit: "Edit",
  cetak: "Cetak",
  pengiriman: "Pengiriman",
  selesai: "Selesai",
};

/** Posisi tahap (0..4). null/tak dikenal -> -1 (belum mulai). */
export function indexTahap(status: string | null): number {
  if (!status) return -1;
  const i = (TAHAP_PENGERJAAN as readonly string[]).indexOf(status);
  return i;
}
```

- [ ] **Step 4: Jalankan, pastikan LULUS**

Run: `npm run test -- statusPengerjaan`
Expected: PASS (5 test).

- [ ] **Step 5: `src/lib/member/queries.ts`**

```ts
import { createClient } from "@/lib/supabase/server";

export type RiwayatBooking = {
  kode_booking: string;
  tanggal: string;
  jam_mulai: string;
  lokasi_sesi: string;
  anak_nama: string;
  status_booking: string;
  status_pengerjaan: string | null;
  sesi: { nama: string } | null;
  package: { nama: string; layanan: { nama: string } | null } | null;
  payment: { status_bayar: string; total: number; ongkos: number; diskon: number; dp_amount: number | null } | null;
};

/** History booking milik user aktif. RLS booking_owner_select membatasi ke miliknya. */
export async function getMyBookings(): Promise<RiwayatBooking[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("booking")
    .select(
      "kode_booking, tanggal, jam_mulai, lokasi_sesi, anak_nama, status_booking, status_pengerjaan, " +
        "sesi:sesi_id(nama), package:package_id(nama, layanan:layanan_id(nama)), " +
        "payment(status_bayar, total, ongkos, diskon, dp_amount)",
    )
    .order("created_at", { ascending: false });
  return (data as unknown as RiwayatBooking[]) ?? [];
}
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/booking/statusPengerjaan.ts src/lib/member/queries.ts tests/unit/statusPengerjaan.test.ts
git commit -m "feat(member): status pengerjaan helper (TDD) + getMyBookings"
```

---

## Task 2: Dashboard member + Stepper

**Files:**
- Create: `src/app/member/Stepper.tsx`
- Modify: `src/app/member/page.tsx` (ganti seluruh isi)

- [ ] **Step 1: `src/app/member/Stepper.tsx`** (server component)

```tsx
import { TAHAP_PENGERJAAN, LABEL_PENGERJAAN, indexTahap } from "@/lib/booking/statusPengerjaan";

export default function Stepper({ status }: { status: string | null }) {
  const aktif = indexTahap(status);
  if (aktif < 0) {
    return <div className="mt-2 rounded-xl bg-slate-50 p-2 text-center text-xs font-bold text-slate-400">⏳ Menunggu sesi foto</div>;
  }
  return (
    <div className="mt-2 rounded-xl bg-slate-50 p-3">
      <div className="flex items-center justify-between">
        {TAHAP_PENGERJAAN.map((t, i) => (
          <div key={t} className="flex flex-1 flex-col items-center">
            <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
              i < aktif ? "bg-pink-400 text-white" : i === aktif ? "bg-pink-500 text-white ring-4 ring-pink-200" : "bg-slate-200 text-slate-500"
            }`}>{i < aktif ? "✓" : i + 1}</div>
            <div className={`mt-1 text-center text-[9px] font-bold ${i === aktif ? "text-pink-600" : "text-slate-400"}`}>
              {LABEL_PENGERJAAN[t]}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Ganti seluruh isi `src/app/member/page.tsx`**

```tsx
import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { getMyBookings } from "@/lib/member/queries";
import { formatRupiah } from "@/lib/format/rupiah";
import Stepper from "./Stepper";

export const dynamic = "force-dynamic";

const LABEL_BAYAR: Record<string, string> = { unpaid: "Belum bayar", dp_paid: "DP terbayar", lunas: "Lunas" };

export default async function MemberPage() {
  const profile = await getCurrentProfile();
  const bookings = await getMyBookings();

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold">Halo, {profile?.nama ?? "Member"} 👋</h1>
          <p className="mt-1 text-sm text-slate-500">Riwayat booking & status pengerjaan fotomu.</p>
        </div>
        <form action="/logout" method="post">
          <button className="rounded-full bg-white px-4 py-2 text-sm font-bold ring-1 ring-black/10">Keluar</button>
        </form>
      </div>

      <Link href="/" className="mt-4 inline-block rounded-full bg-grad px-4 py-2 text-sm font-bold text-white">+ Booking Baru</Link>

      <h2 className="mt-6 text-lg font-bold">Booking Saya</h2>
      {bookings.length === 0 ? (
        <p className="mt-2 text-slate-500">Belum ada booking.</p>
      ) : (
        <div className="mt-3 flex flex-col gap-3">
          {bookings.map((b) => {
            const pay = b.payment;
            const status = pay?.status_bayar ?? "unpaid";
            const tagihan = (pay?.total ?? 0) + (pay?.ongkos ?? 0) - (pay?.diskon ?? 0);
            return (
              <div key={b.kode_booking} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-mono font-bold">{b.kode_booking}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold">{LABEL_BAYAR[status] ?? status}</span>
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  {b.package?.layanan?.nama ? `${b.package.layanan.nama} · ` : ""}{b.package?.nama ?? "-"} · {b.tanggal} · {b.sesi?.nama ?? ""}
                </p>
                <p className="text-xs text-slate-400">{b.lokasi_sesi === "home" ? "Home Service" : "Di Studio"} · {b.anak_nama} · Total {formatRupiah(tagihan)}</p>
                <Stepper status={b.status_pengerjaan} />
                <div className="mt-3 flex gap-2 text-xs font-bold">
                  <Link href={`/booking/${b.kode_booking}`} className="rounded-full bg-white px-3 py-1.5 ring-1 ring-black/10">Detail</Link>
                  <a href={`/invoice/${b.kode_booking}`} target="_blank" rel="noreferrer" className="rounded-full bg-white px-3 py-1.5 ring-1 ring-black/10">Invoice</a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/member/Stepper.tsx src/app/member/page.tsx
git commit -m "feat(member): dashboard riwayat booking + stepper status pengerjaan"
```

---

## Task 3: Query admin transaksi (list + detail)

**Files:**
- Modify: `src/lib/booking/queries.ts` (tambah `listTransaksiAdmin` + `getDetailTransaksi` di akhir; jangan ubah `getBookingByKode`)

- [ ] **Step 1: Tambah di akhir `src/lib/booking/queries.ts`**

```ts
// ============ Admin: daftar & detail transaksi ============

export type TransaksiRow = {
  id: string;
  kode_booking: string;
  tanggal: string;
  anak_nama: string;
  status_booking: string;
  status_pengerjaan: string | null;
  sesi: { nama: string } | null;
  package: { nama: string; layanan: { nama: string } | null } | null;
  payment: { id: string; status_bayar: string; total: number; ongkos: number; diskon: number; bukti_url: string | null } | null;
  profile: { nama: string | null } | null;
  bukti_signed_url: string | null;
};

export type FilterTransaksi = { status?: string; dari?: string; sampai?: string; page?: number };
export const TRANSAKSI_PER_PAGE = 10;
export type HasilTransaksi = { rows: TransaksiRow[]; total: number };

export async function listTransaksiAdmin(filter: FilterTransaksi = {}): Promise<HasilTransaksi> {
  const admin = createAdminClient();
  const page = Math.max(1, filter.page ?? 1);
  const from = (page - 1) * TRANSAKSI_PER_PAGE;
  const to = from + TRANSAKSI_PER_PAGE - 1;

  const paymentSelect = filter.status
    ? "payment!inner(id, status_bayar, total, ongkos, diskon, bukti_url)"
    : "payment(id, status_bayar, total, ongkos, diskon, bukti_url)";

  let q = admin
    .from("booking")
    .select(
      "id, kode_booking, tanggal, anak_nama, status_booking, status_pengerjaan, " +
        "sesi:sesi_id(nama), package:package_id(nama, layanan:layanan_id(nama)), " +
        "profile:customer_profile_id(nama), " +
        paymentSelect,
      { count: "exact" },
    )
    .order("created_at", { ascending: false });

  if (filter.status) q = q.eq("payment.status_bayar", filter.status);
  if (filter.dari) q = q.gte("tanggal", filter.dari);
  if (filter.sampai) q = q.lte("tanggal", filter.sampai);

  const { data, count } = await q.range(from, to);
  const rows = (data as unknown as Omit<TransaksiRow, "bukti_signed_url">[]) ?? [];

  const withSigned = await Promise.all(
    rows.map(async (r) => {
      let bukti_signed_url: string | null = null;
      const path = r.payment?.bukti_url;
      if (path) {
        const { data: signed } = await admin.storage.from("bukti-tf").createSignedUrl(path, 3600);
        bukti_signed_url = signed?.signedUrl ?? null;
      }
      return { ...r, bukti_signed_url };
    }),
  );
  return { rows: withSigned, total: count ?? 0 };
}

export type DetailTransaksi = {
  id: string;
  kode_booking: string;
  tanggal: string;
  jam_mulai: string;
  status_booking: string;
  status_pengerjaan: string | null;
  anak_nama: string;
  anak_bb: number;
  anak_jk: string;
  lokasi_sesi: string;
  alamat_sesi: string | null;
  sesi_id: string;
  package_id: string;
  sesi: { nama: string } | null;
  zona: { nama: string } | null;
  package: { nama: string; harga: number; durasi_menit: number; dp_persen: number; layanan_id: string; layanan: { nama: string; admin_wa: string } | null } | null;
  payment: { id: string; status_bayar: string; total: number; ongkos: number; diskon: number; dp_amount: number | null; bukti_url: string | null } | null;
  profile: { nama: string | null; email: string | null; no_wa: string | null; alamat: string | null } | null;
  bukti_signed_url: string | null;
};

export async function getDetailTransaksi(kode: string): Promise<DetailTransaksi | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("booking")
    .select(
      "id, kode_booking, tanggal, jam_mulai, status_booking, status_pengerjaan, " +
        "anak_nama, anak_bb, anak_jk, lokasi_sesi, alamat_sesi, sesi_id, package_id, " +
        "sesi:sesi_id(nama), zona:zona_id(nama), " +
        "package:package_id(nama, harga, durasi_menit, dp_persen, layanan_id, layanan:layanan_id(nama, admin_wa)), " +
        "payment(id, status_bayar, total, ongkos, diskon, dp_amount, bukti_url), " +
        "profile:customer_profile_id(nama, email, no_wa, alamat)",
    )
    .eq("kode_booking", kode)
    .maybeSingle();
  if (!data) return null;
  const row = data as unknown as Omit<DetailTransaksi, "bukti_signed_url">;

  let bukti_signed_url: string | null = null;
  const path = row.payment?.bukti_url;
  if (path) {
    const { data: signed } = await admin.storage.from("bukti-tf").createSignedUrl(path, 3600);
    bukti_signed_url = signed?.signedUrl ?? null;
  }
  return { ...row, bukti_signed_url };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/booking/queries.ts
git commit -m "feat(admin): listTransaksiAdmin + getDetailTransaksi (layanan/anak/ongkos/diskon/status pengerjaan)"
```

---

## Task 4: Server actions admin (bayar/status/reschedule)

**Files:**
- Create: `src/lib/booking/adminPayment.ts`

- [ ] **Step 1: `src/lib/booking/adminPayment.ts`**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { getSesiTersedia } from "./sesiAvailability";
import { hitungDp } from "./hitung";
import { TAHAP_PENGERJAAN } from "./statusPengerjaan";

async function guardAdmin() {
  const me = await getCurrentProfile();
  if (me?.role !== "admin") throw new Error("forbidden");
  return me;
}

/**
 * Simpan detail pembayaran: override ongkos & diskon, set status bayar.
 * DP dihitung ulang = (total + ongkos − diskon) × dp_persen. Guard kapasitas
 * per (layanan, sesi, tanggal) saat menuju dp_paid/lunas.
 */
export async function simpanDetailTransaksi(formData: FormData) {
  const me = await guardAdmin();
  const bookingId = String(formData.get("bookingId") ?? "");
  const paymentId = String(formData.get("paymentId") ?? "");
  const kode = String(formData.get("kode") ?? "");
  const status = String(formData.get("status") ?? "unpaid");
  const ongkos = Math.max(0, Number(formData.get("ongkos") ?? 0));
  const diskon = Math.max(0, Number(formData.get("diskon") ?? 0));
  const admin = createAdminClient();

  // Ambil booking (sesi, tanggal, layanan, dp_persen, total).
  const { data: b } = await admin
    .from("booking")
    .select("sesi_id, tanggal, package:package_id(layanan_id, dp_persen), payment(total)")
    .eq("id", bookingId)
    .single();
  if (!b) redirect(`/admin/transaksi/${kode}?error=Booking%20tidak%20ditemukan`);
  // Cast nested-select PostgREST (union dgn tipe error) sekali.
  const bb = b as unknown as {
    sesi_id: string;
    tanggal: string;
    package: { layanan_id: string; dp_persen: number } | null;
    payment: { total: number } | null;
  };
  const pkg = bb.package;
  const total = bb.payment?.total ?? 0;

  // Guard kapasitas per layanan: tak boleh terbayar bila sesi+tanggal+layanan sudah diisi booking terbayar LAIN.
  if (status === "dp_paid" || status === "lunas") {
    const { data: lain } = await admin
      .from("booking")
      .select("id, package!inner(layanan_id), payment!inner(status_bayar)")
      .eq("tanggal", bb.tanggal)
      .eq("sesi_id", bb.sesi_id)
      .eq("package.layanan_id", pkg?.layanan_id ?? "")
      .in("payment.status_bayar", ["dp_paid", "lunas"])
      .neq("id", bookingId);
    if ((lain ?? []).length > 0) {
      redirect(`/admin/transaksi/${kode}?error=Sesi%20sudah%20terisi%20booking%20lain%20di%20layanan%20ini`);
    }
  }

  const dp = hitungDp(total + ongkos - diskon, pkg?.dp_persen ?? 30);

  // Selalu simpan ongkos/diskon/dp.
  await admin.from("payment").update({ ongkos, diskon, dp_amount: dp }).eq("id", paymentId);

  if (status === "lunas") {
    const { error } = await admin.rpc("set_payment_lunas", { p_payment_id: paymentId, p_admin: me.id });
    if (error) redirect(`/admin/transaksi/${kode}?error=${encodeURIComponent(error.message)}`);
  } else if (status === "dp_paid") {
    await admin.from("payment").update({ status_bayar: "dp_paid", dibayar_at: new Date().toISOString(), dicatat_oleh: me.id }).eq("id", paymentId);
    await admin.from("booking").update({ status_booking: "confirmed" }).eq("id", bookingId);
  } else {
    await admin.from("payment").update({ status_bayar: "unpaid" }).eq("id", paymentId);
    await admin.from("booking").update({ status_booking: "pending" }).eq("id", bookingId);
  }

  revalidatePath(`/admin/transaksi/${kode}`);
  revalidatePath("/admin/transaksi");
  redirect(`/admin/transaksi/${kode}?ok=1`);
}

/** Atur status pengerjaan foto (boleh dikosongkan -> belum mulai / NULL). */
export async function updateStatusPengerjaan(formData: FormData) {
  await guardAdmin();
  const bookingId = String(formData.get("bookingId") ?? "");
  const kode = String(formData.get("kode") ?? "");
  const raw = String(formData.get("status_pengerjaan") ?? "");
  const nilai = (TAHAP_PENGERJAAN as readonly string[]).includes(raw) ? raw : null;
  const admin = createAdminClient();
  await admin.from("booking").update({ status_pengerjaan: nilai }).eq("id", bookingId);
  revalidatePath(`/admin/transaksi/${kode}`);
  redirect(`/admin/transaksi/${kode}?ok=1`);
}

/** Reschedule: ubah paket/tanggal/sesi dengan validasi ketersediaan sesi (kapasitas per layanan). */
export async function rescheduleBooking(formData: FormData) {
  await guardAdmin();
  const bookingId = String(formData.get("bookingId") ?? "");
  const kode = String(formData.get("kode") ?? "");
  const packageId = String(formData.get("packageId") ?? "");
  const tanggal = String(formData.get("tanggal") ?? "");
  const sesiId = String(formData.get("sesiId") ?? "");
  const admin = createAdminClient();

  const tersedia = await getSesiTersedia(packageId, tanggal);
  const sesi = tersedia.find((s) => s.id === sesiId);
  if (!sesi) redirect(`/admin/transaksi/${kode}?error=Sesi%20tujuan%20tidak%20tersedia`);

  await admin
    .from("booking")
    .update({ package_id: packageId, tanggal, sesi_id: sesiId, jam_mulai: sesi!.jam_mulai })
    .eq("id", bookingId);

  revalidatePath(`/admin/transaksi/${kode}`);
  revalidatePath("/admin/transaksi");
  redirect(`/admin/transaksi/${kode}?ok=1`);
}
```

> Catatan keterbatasan diterima (MVP): saat reschedule ke tanggal+sesi yang sama dan booking ini sudah dp_paid/lunas, `getSesiTersedia` menghitung booking ini sendiri sebagai "terpakai". Admin set status `unpaid` dulu bila perlu. Tidak menambah exclude-self.

- [ ] **Step 2: Commit**

```bash
git add src/lib/booking/adminPayment.ts
git commit -m "feat(admin): simpanDetailTransaksi (override ongkos/diskon, DP recompute), updateStatusPengerjaan, rescheduleBooking"
```

---

## Task 5: Halaman admin transaksi (daftar + detail) + WA + dashboard link

**Files:**
- Create: `src/app/admin/transaksi/page.tsx`, `src/app/admin/transaksi/[kode]/page.tsx`, `src/app/admin/transaksi/[kode]/KirimInvoiceWA.tsx`
- Modify: `src/app/admin/page.tsx`

- [ ] **Step 1: `src/app/admin/transaksi/page.tsx`** (daftar + filter + pagination)

```tsx
import Link from "next/link";
import { listTransaksiAdmin, TRANSAKSI_PER_PAGE, type FilterTransaksi } from "@/lib/booking/queries";
import { formatRupiah } from "@/lib/format/rupiah";
import { LABEL_PENGERJAAN, indexTahap, TAHAP_PENGERJAAN } from "@/lib/booking/statusPengerjaan";

export const dynamic = "force-dynamic";
const LABEL_BAYAR: Record<string, string> = { unpaid: "Belum bayar", dp_paid: "Sudah DP", lunas: "Lunas" };

export default async function TransaksiAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; dari?: string; sampai?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const filter: FilterTransaksi = { status: sp.status || undefined, dari: sp.dari || undefined, sampai: sp.sampai || undefined, page };
  const { rows, total } = await listTransaksiAdmin(filter);
  const totalHalaman = Math.max(1, Math.ceil(total / TRANSAKSI_PER_PAGE));

  const buatHref = (p: number) => {
    const params = new URLSearchParams();
    if (filter.status) params.set("status", filter.status);
    if (filter.dari) params.set("dari", filter.dari);
    if (filter.sampai) params.set("sampai", filter.sampai);
    params.set("page", String(p));
    return `/admin/transaksi?${params.toString()}`;
  };

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Transaksi</h1>
        <Link href="/admin" className="text-sm text-slate-500 underline">← Dashboard</Link>
      </div>

      <form method="get" className="mt-4 flex flex-wrap items-end gap-3">
        <label className="flex flex-col text-sm">Status
          <select name="status" defaultValue={filter.status ?? ""} className="mt-1 rounded border border-slate-300 p-2">
            <option value="">Semua</option><option value="unpaid">Belum bayar</option><option value="dp_paid">Sudah DP</option><option value="lunas">Lunas</option>
          </select>
        </label>
        <label className="flex flex-col text-sm">Dari<input type="date" name="dari" defaultValue={filter.dari ?? ""} className="mt-1 rounded border border-slate-300 p-2" /></label>
        <label className="flex flex-col text-sm">Sampai<input type="date" name="sampai" defaultValue={filter.sampai ?? ""} className="mt-1 rounded border border-slate-300 p-2" /></label>
        <button className="h-11 rounded bg-slate-800 px-4 text-white">Terapkan</button>
        <Link href="/admin/transaksi" className="flex h-11 items-center rounded border border-slate-300 px-4 text-sm">Reset</Link>
      </form>

      <p className="mt-4 text-sm text-slate-500">{total} transaksi · halaman {page} dari {totalHalaman}</p>

      {rows.length === 0 ? (
        <p className="mt-2 text-slate-500">Tidak ada transaksi.</p>
      ) : (
        <div className="mt-2 flex flex-col gap-3">
          {rows.map((r) => {
            const status = r.payment?.status_bayar ?? "unpaid";
            const tahap = indexTahap(r.status_pengerjaan);
            const tagihan = (r.payment?.total ?? 0) + (r.payment?.ongkos ?? 0) - (r.payment?.diskon ?? 0);
            return (
              <Link key={r.id} href={`/admin/transaksi/${r.kode_booking}`} className="block rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-mono font-semibold">{r.kode_booking}</span>
                  <span className="flex gap-1">
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-xs">{LABEL_BAYAR[status] ?? status}</span>
                    <span className="rounded bg-pink-100 px-2 py-0.5 text-xs text-pink-600">{tahap < 0 ? "Belum mulai" : LABEL_PENGERJAAN[TAHAP_PENGERJAAN[tahap]]}</span>
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  {r.package?.layanan?.nama ?? "-"} · {r.package?.nama ?? "-"} · {r.tanggal} {r.sesi?.nama ?? ""} · {r.profile?.nama ?? "Member"}
                </p>
                <p className="mt-1 text-sm">Total: {formatRupiah(tagihan)}</p>
              </Link>
            );
          })}
        </div>
      )}

      {totalHalaman > 1 && (
        <div className="mt-6 flex items-center justify-between">
          {page > 1 ? <Link href={buatHref(page - 1)} className="flex h-10 items-center rounded border border-slate-300 px-4 text-sm">← Sebelumnya</Link> : <span className="flex h-10 items-center rounded border border-slate-200 px-4 text-sm text-slate-300">← Sebelumnya</span>}
          <span className="text-sm text-slate-500">{page} / {totalHalaman}</span>
          {page < totalHalaman ? <Link href={buatHref(page + 1)} className="flex h-10 items-center rounded border border-slate-300 px-4 text-sm">Berikutnya →</Link> : <span className="flex h-10 items-center rounded border border-slate-200 px-4 text-sm text-slate-300">Berikutnya →</span>}
        </div>
      )}
    </main>
  );
}
```

- [ ] **Step 2: `src/app/admin/transaksi/[kode]/KirimInvoiceWA.tsx`**

```tsx
"use client";
import { normalisasiWa } from "@/lib/booking/waLink";

export default function KirimInvoiceWA({
  noWa, kode, layanan, paket, tanggal, sesi, total, status,
}: {
  noWa: string; kode: string; layanan: string; paket: string; tanggal: string; sesi: string; total: number; status: string;
}) {
  function kirim() {
    const origin = window.location.origin;
    const teks =
      `Halo, berikut detail transaksi Anda di Ruang Baby Happy:\n` +
      `Kode: ${kode}\nLayanan: ${layanan}\nPaket: ${paket}\nJadwal: ${tanggal} (${sesi})\n` +
      `Total: Rp${total.toLocaleString("id-ID")}\nStatus: ${status}\n` +
      `Invoice: ${origin}/invoice/${kode}\nTerima kasih! 🎀`;
    window.open(`https://wa.me/${normalisasiWa(noWa)}?text=${encodeURIComponent(teks)}`, "_blank", "noopener,noreferrer");
  }
  return (
    <button type="button" onClick={kirim} disabled={!noWa}
      className="h-10 rounded bg-green-500 px-4 text-sm font-bold text-white disabled:opacity-40">
      Kirim Invoice WA
    </button>
  );
}
```

- [ ] **Step 3: `src/app/admin/transaksi/[kode]/page.tsx`**

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDetailTransaksi } from "@/lib/booking/queries";
import { simpanDetailTransaksi, updateStatusPengerjaan, rescheduleBooking } from "@/lib/booking/adminPayment";
import { listPaket, listSesi } from "@/lib/admin/masterQueries";
import { formatRupiah } from "@/lib/format/rupiah";
import { TAHAP_PENGERJAAN, LABEL_PENGERJAAN } from "@/lib/booking/statusPengerjaan";
import KirimInvoiceWA from "./KirimInvoiceWA";

export const dynamic = "force-dynamic";
const LABEL_BAYAR: Record<string, string> = { unpaid: "Belum bayar", dp_paid: "Sudah DP", lunas: "Lunas" };
const inp = "mt-1 block w-full rounded border border-slate-300 p-2";

export default async function DetailTransaksiPage({
  params, searchParams,
}: {
  params: Promise<{ kode: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { kode } = await params;
  const { error, ok } = await searchParams;
  const d = await getDetailTransaksi(kode);
  if (!d) notFound();

  const [paket, sesi] = await Promise.all([listPaket(), listSesi()]);
  const pay = d.payment;
  const status = pay?.status_bayar ?? "unpaid";
  const total = pay?.total ?? 0;
  const ongkos = pay?.ongkos ?? 0;
  const diskon = pay?.diskon ?? 0;
  const tagihan = total + ongkos - diskon;
  const dp = pay?.dp_amount ?? 0;
  const sisa = status === "lunas" ? 0 : Math.max(0, tagihan - dp);
  const curTahap = d.status_pengerjaan ?? "";

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Detail Transaksi</h1>
        <Link href="/admin/transaksi" className="text-sm text-slate-500 underline">← Transaksi</Link>
      </div>

      {ok && <p className="mt-3 rounded border border-green-300 bg-green-50 p-2 text-sm text-green-700">Perubahan tersimpan.</p>}
      {error && <p className="mt-3 rounded border border-red-300 bg-red-50 p-2 text-sm text-red-700">{error}</p>}

      <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
        <p className="font-mono text-lg font-bold">{d.kode_booking}</p>
        <dl className="mt-3 grid grid-cols-3 gap-y-2 text-sm">
          <dt className="text-slate-500">Customer</dt><dd className="col-span-2">{d.profile?.nama ?? "Member"} · {d.profile?.no_wa ?? "-"}</dd>
          <dt className="text-slate-500">Email</dt><dd className="col-span-2">{d.profile?.email ?? "-"}</dd>
          <dt className="text-slate-500">Anak</dt><dd className="col-span-2">{d.anak_nama} · {d.anak_bb} kg · {d.anak_jk}</dd>
          <dt className="text-slate-500">Lokasi</dt><dd className="col-span-2">{d.lokasi_sesi === "home" ? `Home${d.zona ? ` · ${d.zona.nama}` : ""}${d.alamat_sesi ? ` · ${d.alamat_sesi}` : ""}` : "Di Studio"}</dd>
          <dt className="text-slate-500">Layanan</dt><dd className="col-span-2">{d.package?.layanan?.nama ?? "-"}</dd>
          <dt className="text-slate-500">Paket</dt><dd className="col-span-2">{d.package?.nama ?? "-"}</dd>
          <dt className="text-slate-500">Jadwal</dt><dd className="col-span-2">{d.tanggal} · {d.sesi?.nama ?? ""} ({d.jam_mulai.slice(0, 5)})</dd>
          <dt className="text-slate-500">Paket</dt><dd className="col-span-2">{formatRupiah(total)}</dd>
          <dt className="text-slate-500">Ongkos</dt><dd className="col-span-2">{formatRupiah(ongkos)}</dd>
          <dt className="text-slate-500">Diskon</dt><dd className="col-span-2">{formatRupiah(diskon)}</dd>
          <dt className="text-slate-500">Total</dt><dd className="col-span-2 font-semibold">{formatRupiah(tagihan)}</dd>
          <dt className="text-slate-500">DP</dt><dd className="col-span-2">{formatRupiah(dp)}</dd>
          <dt className="text-slate-500">Sisa</dt><dd className="col-span-2">{formatRupiah(sisa)}</dd>
          <dt className="text-slate-500">Status bayar</dt><dd className="col-span-2">{LABEL_BAYAR[status] ?? status}</dd>
        </dl>
        {d.bukti_signed_url && (
          <a href={d.bukti_signed_url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block rounded border border-slate-300 px-3 py-1.5 text-sm">Lihat bukti TF</a>
        )}
      </div>

      {/* Pembayaran: override ongkos/diskon + status (DP dihitung ulang) */}
      <form action={simpanDetailTransaksi} className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="font-semibold text-slate-700">Pembayaran</h2>
        <input type="hidden" name="bookingId" value={d.id} />
        <input type="hidden" name="paymentId" value={pay?.id ?? ""} />
        <input type="hidden" name="kode" value={d.kode_booking} />
        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="block text-sm">Ongkos (Rp)<input type="number" name="ongkos" defaultValue={ongkos} min={0} className={inp} /></label>
          <label className="block text-sm">Diskon (Rp)<input type="number" name="diskon" defaultValue={diskon} min={0} className={inp} /></label>
        </div>
        <label className="mt-3 block text-sm">Status pembayaran
          <select name="status" defaultValue={status} className={inp}>
            <option value="unpaid">Belum bayar</option><option value="dp_paid">Sudah DP</option><option value="lunas">Lunas</option>
          </select>
        </label>
        <p className="mt-2 text-xs text-slate-400">DP dihitung ulang otomatis = (paket + ongkos − diskon) × {d.package?.dp_persen ?? 30}%.</p>
        <button className="mt-3 h-10 rounded bg-slate-800 px-4 text-sm text-white">Simpan</button>
      </form>

      {/* Status pengerjaan */}
      <form action={updateStatusPengerjaan} className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="font-semibold text-slate-700">Status Pengerjaan</h2>
        <input type="hidden" name="bookingId" value={d.id} />
        <input type="hidden" name="kode" value={d.kode_booking} />
        <select name="status_pengerjaan" defaultValue={curTahap} className={inp}>
          <option value="">Belum mulai</option>
          {TAHAP_PENGERJAAN.map((t) => <option key={t} value={t}>{LABEL_PENGERJAAN[t]}</option>)}
        </select>
        <button className="mt-3 h-10 rounded bg-slate-800 px-4 text-sm text-white">Simpan Status</button>
      </form>

      {/* Reschedule */}
      <form action={rescheduleBooking} className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="font-semibold text-slate-700">Reschedule</h2>
        <input type="hidden" name="bookingId" value={d.id} />
        <input type="hidden" name="kode" value={d.kode_booking} />
        <label className="mt-3 block text-sm">Paket
          <select name="packageId" defaultValue={d.package_id} className={inp}>
            {paket.filter((p) => p.is_active).map((p) => <option key={p.id} value={p.id}>{p.nama}</option>)}
          </select>
        </label>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="block text-sm">Tanggal<input type="date" name="tanggal" defaultValue={d.tanggal} className={inp} /></label>
          <label className="block text-sm">Sesi
            <select name="sesiId" defaultValue={d.sesi_id} className={inp}>
              {sesi.filter((s) => s.is_active).map((s) => <option key={s.id} value={s.id}>{s.nama} ({s.jam_mulai.slice(0, 5)})</option>)}
            </select>
          </label>
        </div>
        <button className="mt-3 h-10 rounded bg-slate-800 px-4 text-sm text-white">Simpan Reschedule</button>
      </form>

      {/* Invoice */}
      <div className="mt-4 flex flex-wrap gap-2">
        <a href={`/invoice/${d.kode_booking}`} target="_blank" rel="noopener noreferrer" className="h-10 rounded border border-slate-300 px-4 text-sm leading-10">Cetak Invoice</a>
        <KirimInvoiceWA
          noWa={d.package?.layanan?.admin_wa ?? ""}
          kode={d.kode_booking}
          layanan={d.package?.layanan?.nama ?? "-"}
          paket={d.package?.nama ?? "-"}
          tanggal={d.tanggal}
          sesi={d.sesi?.nama ?? ""}
          total={tagihan}
          status={LABEL_BAYAR[status] ?? status}
        />
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Ganti seluruh isi `src/app/admin/page.tsx`**

```tsx
import Link from "next/link";

export default function AdminHome() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold text-slate-800">Panel Admin</h1>
      <p className="mt-2 text-slate-500">Kelola data & transaksi Ruang Baby Happy.</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link href="/admin/transaksi" className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-bold text-white">Transaksi</Link>
        <Link href="/admin/laporan" className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-bold text-white">Laporan</Link>
        <Link href="/admin/master" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700">Master Data</Link>
      </div>
      <form action="/logout" method="post" className="mt-6">
        <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700">Keluar</button>
      </form>
    </main>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add "src/app/admin/transaksi" src/app/admin/page.tsx
git commit -m "feat(admin): daftar+detail transaksi (bayar/status pengerjaan/reschedule) + KirimInvoiceWA + dashboard link"
```

---

## Task 6: Invoice PDF

**Files:**
- Create: `src/lib/invoice/InvoiceDocument.tsx`, `src/app/invoice/[kode]/route.ts`

- [ ] **Step 1: `src/lib/invoice/InvoiceDocument.tsx`**

```tsx
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { formatRupiah } from "@/lib/format/rupiah";

export type InvoiceData = {
  kode: string; nama: string; noWa: string;
  anak: string; lokasi: string;
  layanan: string; paket: string; tanggal: string; sesi: string;
  total: number; ongkos: number; diskon: number; tagihan: number; dp: number; sisa: number;
  status: string; tglCetak: string;
};

const s = StyleSheet.create({
  page: { padding: 36, fontSize: 11, color: "#111" },
  brand: { fontSize: 18, fontWeight: 700 },
  tagline: { color: "#888", marginBottom: 16 },
  h: { fontSize: 13, fontWeight: 700, marginTop: 14, marginBottom: 6 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  label: { color: "#666" },
  total: { fontSize: 14, fontWeight: 700 },
  foot: { marginTop: 24, color: "#888" },
});

export function InvoiceDocument({ d }: { d: InvoiceData }) {
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Text style={s.brand}>Ruang Baby Happy</Text>
        <Text style={s.tagline}>imagine your little moment</Text>

        <View style={s.row}><Text style={s.label}>No. Transaksi</Text><Text>{d.kode}</Text></View>
        <View style={s.row}><Text style={s.label}>Tanggal cetak</Text><Text>{d.tglCetak}</Text></View>

        <Text style={s.h}>Customer</Text>
        <View style={s.row}><Text style={s.label}>Nama</Text><Text>{d.nama}</Text></View>
        <View style={s.row}><Text style={s.label}>No WA</Text><Text>{d.noWa}</Text></View>
        <View style={s.row}><Text style={s.label}>Anak</Text><Text>{d.anak}</Text></View>
        <View style={s.row}><Text style={s.label}>Lokasi</Text><Text>{d.lokasi}</Text></View>

        <Text style={s.h}>Pesanan</Text>
        <View style={s.row}><Text style={s.label}>Layanan</Text><Text>{d.layanan}</Text></View>
        <View style={s.row}><Text style={s.label}>Paket</Text><Text>{d.paket}</Text></View>
        <View style={s.row}><Text style={s.label}>Jadwal</Text><Text>{d.tanggal} · {d.sesi}</Text></View>

        <Text style={s.h}>Pembayaran</Text>
        <View style={s.row}><Text style={s.label}>Paket</Text><Text>{formatRupiah(d.total)}</Text></View>
        <View style={s.row}><Text style={s.label}>Home Service</Text><Text>{formatRupiah(d.ongkos)}</Text></View>
        <View style={s.row}><Text style={s.label}>Diskon</Text><Text>-{formatRupiah(d.diskon)}</Text></View>
        <View style={s.row}><Text style={s.label}>Total</Text><Text style={s.total}>{formatRupiah(d.tagihan)}</Text></View>
        <View style={s.row}><Text style={s.label}>DP</Text><Text>{formatRupiah(d.dp)}</Text></View>
        <View style={s.row}><Text style={s.label}>Sisa</Text><Text>{formatRupiah(d.sisa)}</Text></View>
        <View style={s.row}><Text style={s.label}>Status</Text><Text>{d.status}</Text></View>

        <Text style={s.foot}>Terima kasih telah mempercayakan momen si kecil pada Ruang Baby Happy 🎀</Text>
      </Page>
    </Document>
  );
}
```

- [ ] **Step 2: `src/app/invoice/[kode]/route.ts`**

```ts
import { renderToBuffer } from "@react-pdf/renderer";
import { getDetailTransaksi } from "@/lib/booking/queries";
import { InvoiceDocument } from "@/lib/invoice/InvoiceDocument";

const LABEL: Record<string, string> = { unpaid: "Belum bayar", dp_paid: "Sudah DP", lunas: "Lunas" };

export async function GET(_req: Request, { params }: { params: Promise<{ kode: string }> }) {
  const { kode } = await params;
  const d = await getDetailTransaksi(kode);
  if (!d) return new Response("Not found", { status: 404 });

  const pay = d.payment;
  const status = pay?.status_bayar ?? "unpaid";
  const total = pay?.total ?? 0;
  const ongkos = pay?.ongkos ?? 0;
  const diskon = pay?.diskon ?? 0;
  const tagihan = total + ongkos - diskon;
  const dp = pay?.dp_amount ?? 0;

  const buffer = await renderToBuffer(
    InvoiceDocument({
      d: {
        kode: d.kode_booking,
        nama: d.profile?.nama ?? "Customer",
        noWa: d.profile?.no_wa ?? "-",
        anak: `${d.anak_nama} · ${d.anak_bb}kg · ${d.anak_jk}`,
        lokasi: d.lokasi_sesi === "home" ? `Home${d.zona ? ` (${d.zona.nama})` : ""}` : "Di Studio",
        layanan: d.package?.layanan?.nama ?? "-",
        paket: d.package?.nama ?? "-",
        tanggal: d.tanggal,
        sesi: d.sesi?.nama ?? "",
        total, ongkos, diskon, tagihan, dp,
        sisa: status === "lunas" ? 0 : Math.max(0, tagihan - dp),
        status: LABEL[status] ?? status,
        tglCetak: new Date().toISOString().slice(0, 10),
      },
    }),
  );

  return new Response(new Uint8Array(buffer), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="invoice-${kode}.pdf"` },
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/invoice/InvoiceDocument.tsx "src/app/invoice"
git commit -m "feat(invoice): PDF Baby Happy (anak/lokasi/ongkos/diskon) + route publik-by-kode"
```

---

## Task 7: Laporan + CSV

**Files:**
- Create: `src/lib/report/aggregate.ts`, `src/lib/report/csv.ts`, `src/lib/report/queries.ts`, `src/app/admin/laporan/page.tsx`, `src/app/admin/laporan/csv/route.ts`
- Test: `tests/unit/reportAggregate.test.ts`

- [ ] **Step 1: Tulis test gagal `tests/unit/reportAggregate.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { rekapPendapatan } from "@/lib/report/aggregate";

describe("rekapPendapatan", () => {
  it("lunas -> tagihan (total+ongkos-diskon); dp_paid -> dp_amount; unpaid -> 0", () => {
    const r = rekapPendapatan([
      { status_bayar: "lunas", total: 1000000, ongkos: 100000, diskon: 50000, dp_amount: 315000 },
      { status_bayar: "dp_paid", total: 750000, ongkos: 0, diskon: 0, dp_amount: 225000 },
      { status_bayar: "unpaid", total: 500000, ongkos: 0, diskon: 0, dp_amount: null },
    ]);
    expect(r.totalPendapatan).toBe(1050000 + 225000);
    expect(r.jumlahBooking).toBe(3);
  });
});
```

- [ ] **Step 2: Jalankan, pastikan GAGAL** — `npm run test -- reportAggregate` → FAIL.

- [ ] **Step 3: `src/lib/report/aggregate.ts`**

```ts
export type BarisBayar = { status_bayar: string; total: number; ongkos: number; diskon: number; dp_amount: number | null };

/** Uang masuk: lunas -> (total+ongkos-diskon), dp_paid -> dp_amount, unpaid -> 0. */
export function rekapPendapatan(rows: BarisBayar[]): { totalPendapatan: number; jumlahBooking: number } {
  let totalPendapatan = 0;
  for (const r of rows) {
    if (r.status_bayar === "lunas") totalPendapatan += r.total + r.ongkos - r.diskon;
    else if (r.status_bayar === "dp_paid") totalPendapatan += r.dp_amount ?? 0;
  }
  return { totalPendapatan, jumlahBooking: rows.length };
}
```

- [ ] **Step 4: Jalankan, pastikan LULUS** — `npm run test -- reportAggregate` → PASS.

- [ ] **Step 5: `src/lib/report/csv.ts`**

```ts
function esc(v: string): string {
  return /[",\r\n]/.test(v) ? `"${v.replaceAll('"', '""')}"` : v;
}

/** Bangun CSV (CRLF antar baris). Sel di-escape sesuai RFC 4180. */
export function toCSV(headers: string[], rows: string[][]): string {
  const lines = [headers.map(esc).join(",")];
  for (const row of rows) lines.push(row.map(esc).join(","));
  return lines.join("\r\n");
}
```

- [ ] **Step 6: `src/lib/report/queries.ts`**

```ts
import { createAdminClient } from "@/lib/supabase/admin";

export type FilterLaporan = { dari?: string; sampai?: string; status?: string };

export type BarisLaporan = {
  kode_booking: string;
  tanggal: string;
  anak_nama: string;
  status_booking: string;
  sesi: { nama: string } | null;
  package: { nama: string; layanan: { nama: string } | null } | null;
  profile: { nama: string | null } | null;
  payment: { status_bayar: string; total: number; ongkos: number; diskon: number; dp_amount: number | null } | null;
};

export async function getLaporan(f: FilterLaporan): Promise<BarisLaporan[]> {
  const admin = createAdminClient();
  let q = admin
    .from("booking")
    .select(
      "kode_booking, tanggal, anak_nama, status_booking, " +
        "sesi:sesi_id(nama), package:package_id(nama, layanan:layanan_id(nama)), " +
        "profile:customer_profile_id(nama), " +
        "payment(status_bayar, total, ongkos, diskon, dp_amount)",
    )
    .order("tanggal", { ascending: false });
  if (f.dari) q = q.gte("tanggal", f.dari);
  if (f.sampai) q = q.lte("tanggal", f.sampai);
  const { data } = await q;
  let rows = (data as unknown as BarisLaporan[]) ?? [];
  if (f.status) rows = rows.filter((r) => (r.payment?.status_bayar ?? "unpaid") === f.status);
  return rows;
}
```

- [ ] **Step 7: `src/app/admin/laporan/page.tsx`**

```tsx
import Link from "next/link";
import { getLaporan, type FilterLaporan } from "@/lib/report/queries";
import { rekapPendapatan } from "@/lib/report/aggregate";
import { formatRupiah } from "@/lib/format/rupiah";

export const dynamic = "force-dynamic";
const LABEL: Record<string, string> = { unpaid: "Belum bayar", dp_paid: "DP terbayar", lunas: "Lunas" };

export default async function LaporanPage({ searchParams }: { searchParams: Promise<FilterLaporan> }) {
  const f = await searchParams;
  const rows = await getLaporan(f);
  const rekap = rekapPendapatan(
    rows.map((r) => r.payment ?? { status_bayar: "unpaid", total: 0, ongkos: 0, diskon: 0, dp_amount: 0 }),
  );
  const csvQuery = new URLSearchParams(Object.entries(f).filter(([, v]) => v) as [string, string][]).toString();

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Laporan Transaksi</h1>
        <Link href="/admin" className="text-sm text-slate-500 underline">← Dashboard</Link>
      </div>

      <form method="get" className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex flex-col text-sm">Dari<input type="date" name="dari" defaultValue={f.dari ?? ""} className="mt-1 rounded border border-slate-300 p-2" /></label>
        <label className="flex flex-col text-sm">Sampai<input type="date" name="sampai" defaultValue={f.sampai ?? ""} className="mt-1 rounded border border-slate-300 p-2" /></label>
        <label className="flex flex-col text-sm">Status
          <select name="status" defaultValue={f.status ?? ""} className="mt-1 rounded border border-slate-300 p-2">
            <option value="">Semua</option><option value="unpaid">Belum bayar</option><option value="dp_paid">DP terbayar</option><option value="lunas">Lunas</option>
          </select>
        </label>
        <button className="h-11 rounded bg-slate-800 px-4 text-white">Terapkan</button>
      </form>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4"><p className="text-sm text-slate-500">Total Pendapatan</p><p className="mt-1 text-xl font-bold">{formatRupiah(rekap.totalPendapatan)}</p></div>
        <div className="rounded-lg border border-slate-200 bg-white p-4"><p className="text-sm text-slate-500">Jumlah Booking</p><p className="mt-1 text-xl font-bold">{rekap.jumlahBooking}</p></div>
      </div>

      <div className="mt-4">
        <a href={`/admin/laporan/csv${csvQuery ? `?${csvQuery}` : ""}`} className="inline-flex h-10 items-center rounded border border-slate-300 px-4 text-sm">Download CSV</a>
      </div>

      <div className="mt-4 overflow-x-auto">
        {rows.length === 0 ? <p className="text-slate-500">Tidak ada transaksi.</p> : (
          <table className="w-full min-w-[680px] border-collapse text-sm">
            <thead><tr className="border-b text-left text-slate-500">
              <th className="py-2 pr-3">Kode</th><th className="py-2 pr-3">Tanggal</th><th className="py-2 pr-3">Layanan</th><th className="py-2 pr-3">Paket</th><th className="py-2 pr-3">Member</th><th className="py-2 pr-3">Status</th><th className="py-2 pr-3 text-right">Total</th>
            </tr></thead>
            <tbody>
              {rows.map((r) => {
                const pay = r.payment; const status = pay?.status_bayar ?? "unpaid";
                const tagihan = (pay?.total ?? 0) + (pay?.ongkos ?? 0) - (pay?.diskon ?? 0);
                return (
                  <tr key={r.kode_booking} className="border-b">
                    <td className="py-2 pr-3 font-mono">{r.kode_booking}</td>
                    <td className="py-2 pr-3">{r.tanggal}</td>
                    <td className="py-2 pr-3">{r.package?.layanan?.nama ?? "-"}</td>
                    <td className="py-2 pr-3">{r.package?.nama ?? "-"}</td>
                    <td className="py-2 pr-3">{r.profile?.nama ?? "Member"}</td>
                    <td className="py-2 pr-3">{LABEL[status] ?? status}</td>
                    <td className="py-2 pr-3 text-right">{formatRupiah(tagihan)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
```

- [ ] **Step 8: `src/app/admin/laporan/csv/route.ts`**

```ts
import { getLaporan } from "@/lib/report/queries";
import { toCSV } from "@/lib/report/csv";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rows = await getLaporan({
    dari: searchParams.get("dari") ?? undefined,
    sampai: searchParams.get("sampai") ?? undefined,
    status: searchParams.get("status") ?? undefined,
  });
  const csv = toCSV(
    ["Kode", "Tanggal", "Layanan", "Paket", "Member", "Status Bayar", "Total"],
    rows.map((r) => {
      const tagihan = (r.payment?.total ?? 0) + (r.payment?.ongkos ?? 0) - (r.payment?.diskon ?? 0);
      return [
        r.kode_booking, r.tanggal,
        r.package?.layanan?.nama ?? "-", r.package?.nama ?? "-",
        r.profile?.nama ?? "Member",
        r.payment?.status_bayar ?? "unpaid", String(tagihan),
      ];
    }),
  );
  return new Response(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="laporan.csv"' },
  });
}
```

- [ ] **Step 9: Commit**

```bash
git add src/lib/report "src/app/admin/laporan" tests/unit/reportAggregate.test.ts
git commit -m "feat(admin): laporan pendapatan (TDD aggregate) + tabel + export CSV"
```

---

## Task 8: E2E admin + verifikasi

**Files:**
- Create: `tests/e2e/admin-transaksi.spec.ts`

- [ ] **Step 1: `tests/e2e/admin-transaksi.spec.ts`** (admin set lunas + status pengerjaan → member lihat; invoice PDF)

```ts
import { test, expect, request as pwRequest } from "@playwright/test";
import fs from "node:fs";

const ADMIN = { email: "admin@ruangbabyhappy.com", pass: "Admin12345!" };
const MEMBER = { email: "member@ruangbabyhappy.com", pass: "Member12345!" };

function env(k: string): string {
  const l = fs.readFileSync(".env.local", "utf8").split("\n").find((x) => x.startsWith(k + "="));
  return l ? l.slice(k.length + 1).trim() : "";
}
const URL = env("NEXT_PUBLIC_SUPABASE_URL");
const KEY = env("SUPABASE_SERVICE_ROLE_KEY");

let paketId = "", bookingId = "", kode = "", memberId = "", sesiId = "";

test.beforeAll(async () => {
  const ctx = await pwRequest.newContext({ userAgent: "rbh-e2e-setup" });
  const h = { apikey: KEY, Authorization: `Bearer ${KEY}` };
  const hj = { ...h, "Content-Type": "application/json", Prefer: "return=representation" };

  const layananId = (await (await ctx.get(`${URL}/rest/v1/layanan?select=id&limit=1`, { headers: h })).json())[0].id;
  sesiId = (await (await ctx.get(`${URL}/rest/v1/sesi?select=id&order=urutan&limit=1`, { headers: h })).json())[0].id;
  memberId = (await (await ctx.get(`${URL}/rest/v1/profiles?select=id&email=eq.${encodeURIComponent(MEMBER.email)}`, { headers: h })).json())[0].id;

  paketId = (await (await ctx.post(`${URL}/rest/v1/package`, { headers: hj, data: { layanan_id: layananId, nama: `E2E-ADM-${Date.now()}`, harga: 1000000, durasi_menit: 60, dp_persen: 30, diskon_returning: 0 } })).json())[0].id;
  kode = `RBH-ADMIN-${Date.now()}`;
  bookingId = (await (await ctx.post(`${URL}/rest/v1/booking`, { headers: hj, data: { kode_booking: kode, package_id: paketId, sesi_id: sesiId, customer_profile_id: memberId, anak_nama: "Bayi Adm", anak_bb: 3.2, anak_jk: "L", lokasi_sesi: "studio", tanggal: new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10), jam_mulai: "09:00", status_booking: "pending" } })).json())[0].id;
  await ctx.post(`${URL}/rest/v1/payment`, { headers: hj, data: { booking_id: bookingId, total: 1000000, ongkos: 0, diskon: 0, dp_amount: 300000, status_bayar: "unpaid" } });
  await ctx.dispose();
});

test.afterAll(async () => {
  const ctx = await pwRequest.newContext({ userAgent: "rbh-e2e-setup" });
  const h = { apikey: KEY, Authorization: `Bearer ${KEY}` };
  await ctx.delete(`${URL}/rest/v1/booking?id=eq.${bookingId}`, { headers: h });
  await ctx.delete(`${URL}/rest/v1/package?id=eq.${paketId}`, { headers: h });
  await ctx.dispose();
});

async function login(page, who: { email: string; pass: string }, urlRe: RegExp) {
  await page.goto("/login");
  await page.getByPlaceholder("Email").fill(who.email);
  await page.getByPlaceholder("Password").fill(who.pass);
  await page.getByRole("button", { name: /Masuk/i }).click();
  await expect(page).toHaveURL(urlRe);
}

test("admin set Lunas + status pengerjaan Edit, lalu member lihat stepper", async ({ page }) => {
  await login(page, ADMIN, /\/admin/);
  await page.goto(`/admin/transaksi/${kode}`);
  await expect(page.getByRole("heading", { name: /Detail Transaksi/i })).toBeVisible();

  // Set Lunas
  await page.locator('select[name="status"]').selectOption("lunas");
  await page.getByRole("button", { name: /^Simpan$/ }).click();
  await expect(page.getByText(/Perubahan tersimpan/)).toBeVisible();

  // Status pengerjaan -> Edit
  await page.locator('select[name="status_pengerjaan"]').selectOption("edit");
  await page.getByRole("button", { name: /Simpan Status/i }).click();
  await expect(page.getByText(/Perubahan tersimpan/)).toBeVisible();

  // Invoice PDF
  const inv = await page.request.get(`/invoice/${kode}`);
  expect(inv.headers()["content-type"]).toContain("application/pdf");
  expect((await inv.body()).length).toBeGreaterThan(500);

  // Member lihat stepper "Edit"
  await page.context().clearCookies();
  await login(page, MEMBER, /\/member/);
  await expect(page.getByText(kode)).toBeVisible();
  await expect(page.getByText("Edit").first()).toBeVisible();
});
```

- [ ] **Step 2: Unit test penuh** — `npm run test` → PASS (rupiah, sesiAvailability, hitung, kode, statusPengerjaan, reportAggregate).

- [ ] **Step 3: Build** (hentikan dev dulu) — `npm run build` → sukses (route `/admin/transaksi`, `/admin/transaksi/[kode]`, `/invoice/[kode]`, `/admin/laporan`, `/admin/laporan/csv`). Ulangi bila Turbopack timeout.

- [ ] **Step 4: E2E** — `npm run test:e2e -- admin-transaksi booking master smoke` → semua PASS. (Kill zombie port 3000/3001 dulu bila perlu.)

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/admin-transaksi.spec.ts
git commit -m "test(e2e): admin set lunas + status pengerjaan -> member stepper + invoice PDF"
```

---

## Self-Review (plan vs spec)

- **Status pengerjaan (spec §3.10):** helper TAHAP_PENGERJAAN+indexTahap (TDD); admin set via dropdown (`updateStatusPengerjaan`, NULL=belum mulai); member lihat **stepper** di `/member` ✓.
- **Admin transaksi (spec §9):** daftar (filter status/tanggal + pagination, tampil status bayar + status pengerjaan) ✓; detail (data anak, lokasi/zona/alamat, rincian paket/ongkos/diskon/total/DP/sisa) ✓; override **ongkos & diskon** + DP **dihitung ulang** ✓; Set Lunas via RPC + **guard kapasitas per (layanan,sesi,tanggal)** ✓; reschedule paket/tanggal/sesi (validasi `getSesiTersedia`) ✓.
- **Invoice (spec §10):** PDF Baby Happy by-kode dengan data anak, lokasi, layanan, ongkos, diskon, total/DP/sisa ✓.
- **WA routing (spec §6):** KirimInvoiceWA pakai `layanan.admin_wa` ✓.
- **Member dashboard (spec §9b):** riwayat booking sendiri (RLS) + stepper + invoice/detail link ✓.
- **Laporan (spec §9):** rekap pendapatan (lunas→tagihan termasuk ongkos−diskon; dp_paid→dp) + tabel + CSV ✓ (TDD aggregate).
- **Tema:** admin & member terang-fungsional ✓ (desain pastel publik = Plan 5).
- **Gotchas E2E** diterapkan (UA non-browser utk setup REST; cast nested-select; selektor value). Tidak ada placeholder kode; tipe konsisten (`TransaksiRow`/`DetailTransaksi`/`BarisLaporan`/`BarisBayar`).
```
