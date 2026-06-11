# Ruang Baby Happy — Plan 2: Katalog + Sesi + Zona + Master Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) atau superpowers:executing-plans. Steps pakai checkbox (`- [ ]`).

**Goal:** Admin bisa mengelola data master (Layanan, Paket, Sesi, Zona ongkos, Blackout), landing menampilkan paket **dikelompokkan per layanan**, dan tersedia helper `getSesiTersedia` (kapasitas 1 per **layanan+sesi+tanggal**) yang dipakai Plan 3.

**Architecture:** Lanjutan Plan 1 (skema & RLS sudah ada). Query katalog pakai server client (RLS public read). Operasi master pakai Server Actions + service-role di-guard `guardAdmin()`. Logika ketersediaan sesi dipisah jadi fungsi murni (TDD) + wrapper service-role.

**Tech Stack:** Next.js 16 App Router (server components + server actions), Supabase, Vitest, Playwright. Tema admin tetap terang-fungsional (desain publik penuh = Plan 5).

**Prasyarat:** Plan 1 selesai (commit ...34ea8b1). DB sudah ter-apply (tabel + seed: 4 layanan, 2 sesi, 3 zona). Dev login admin: `admin@ruangbabyhappy.com` / `Admin12345!`.

---

## File Structure (Plan 2)

```
src/lib/time/time.ts                      # toMinutes (HH:MM[:SS] -> menit)
src/lib/booking/sesiAvailability.ts       # filterSesiTersedia (murni) + getSesiTersedia (service-role)
src/lib/catalog/queries.ts                # getLayananDenganPaket (landing), getPackageById (detail)
src/lib/admin/masterQueries.ts            # list* untuk master
src/lib/admin/masterActions.ts            # guardAdmin + CRUD (buat/update/toggle/hapus)
src/app/admin/master/page.tsx             # hub menu master
src/app/admin/master/layanan/page.tsx
src/app/admin/master/paket/page.tsx
src/app/admin/master/sesi/page.tsx
src/app/admin/master/zona/page.tsx
src/app/admin/master/blackout/page.tsx
src/app/admin/page.tsx                     # (modifikasi) tambah link ke /admin/master
src/app/page.tsx                           # (modifikasi) render paket per layanan
tests/unit/sesiAvailability.test.ts
tests/e2e/master.spec.ts
```

**Aturan delete master (FK-safe):** `layanan/paket/sesi/zona` = **toggle `is_active`** (soft) karena direferensi FK (package/booking). `blackout_date` = **hard delete** (tak direferensi). Ini sedikit menyesuaikan spec (spec menyebut "hard untuk sesi") demi keamanan FK booking.

---

## Task 1: Helper waktu + ketersediaan sesi (TDD)

**Files:**
- Create: `src/lib/time/time.ts`, `src/lib/booking/sesiAvailability.ts`
- Test: `tests/unit/sesiAvailability.test.ts`

- [ ] **Step 1: `src/lib/time/time.ts`**

```ts
/** "HH:MM" atau "HH:MM:SS" -> menit sejak tengah malam. */
export function toMinutes(hhmm: string): number {
  const h = Number(hhmm.slice(0, 2));
  const m = Number(hhmm.slice(3, 5));
  return h * 60 + m;
}
```

- [ ] **Step 2: Tulis test gagal `tests/unit/sesiAvailability.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { filterSesiTersedia, type SesiOpsi } from "@/lib/booking/sesiAvailability";

const sesi: SesiOpsi[] = [
  { id: "s1", nama: "Sesi 1", jam_mulai: "09:00:00", urutan: 1 },
  { id: "s2", nama: "Sesi 2", jam_mulai: "13:00:00", urutan: 2 },
];

describe("filterSesiTersedia", () => {
  it("semua tersedia bila tak ada yang terpakai & bukan hari ini", () => {
    const out = filterSesiTersedia(sesi, [], false, false, 0);
    expect(out.map((s) => s.id)).toEqual(["s1", "s2"]);
  });

  it("blackout -> kosong", () => {
    expect(filterSesiTersedia(sesi, [], true, false, 0)).toEqual([]);
  });

  it("sesi terpakai (paid utk layanan+tanggal) dibuang", () => {
    const out = filterSesiTersedia(sesi, ["s1"], false, false, 0);
    expect(out.map((s) => s.id)).toEqual(["s2"]);
  });

  it("hari ini: sesi yang jamnya sudah lewat dibuang", () => {
    // sekarang 10:00 (600 menit) -> Sesi 1 (09:00) lewat, Sesi 2 (13:00) masih
    const out = filterSesiTersedia(sesi, [], false, true, 600);
    expect(out.map((s) => s.id)).toEqual(["s2"]);
  });
});
```

- [ ] **Step 3: Jalankan, pastikan GAGAL**

Run: `npm run test -- sesiAvailability`
Expected: FAIL — `Cannot find module '@/lib/booking/sesiAvailability'`.

- [ ] **Step 4: `src/lib/booking/sesiAvailability.ts`**

```ts
import { createAdminClient } from "@/lib/supabase/admin";
import { toMinutes } from "@/lib/time/time";

export type SesiOpsi = { id: string; nama: string; jam_mulai: string; urutan: number };

/**
 * Fungsi murni: saring sesi yang tersedia.
 * - isBlackout: tanggal tutup -> kosong.
 * - sesiTerpakaiIds: sesi yang sudah dikunci booking terbayar (dp_paid/lunas) utk LAYANAN+TANGGAL ini.
 * - isHariIni + nowMinutes: buang sesi yang jam mulainya sudah lewat hari ini.
 */
export function filterSesiTersedia(
  sesiAktif: SesiOpsi[],
  sesiTerpakaiIds: string[],
  isBlackout: boolean,
  isHariIni: boolean,
  nowMinutes: number,
): SesiOpsi[] {
  if (isBlackout) return [];
  const terpakai = new Set(sesiTerpakaiIds);
  return sesiAktif.filter((s) => {
    if (terpakai.has(s.id)) return false;
    if (isHariIni && toMinutes(s.jam_mulai) <= nowMinutes) return false;
    return true;
  });
}

/**
 * Ketersediaan sesi untuk sebuah paket pada sebuah tanggal ("YYYY-MM-DD").
 * Kapasitas 1 per (layanan, sesi, tanggal): sesi terkunci bila ADA booking lain
 * untuk paket SE-LAYANAN pada tanggal+sesi sama dengan status bayar dp_paid/lunas.
 */
export async function getSesiTersedia(packageId: string, tanggal: string): Promise<SesiOpsi[]> {
  const admin = createAdminClient();

  // 1. Paket -> layanan_id (+ aktif?)
  const { data: paket } = await admin
    .from("package")
    .select("layanan_id, is_active")
    .eq("id", packageId)
    .single();
  if (!paket || !paket.is_active) return [];
  const layananId = paket.layanan_id as string;

  // 2. Blackout?
  const { data: blackout } = await admin
    .from("blackout_date")
    .select("id")
    .eq("tanggal", tanggal)
    .maybeSingle();
  const isBlackout = !!blackout;

  // 3. Sesi aktif (urut)
  const { data: sesiRows } = await admin
    .from("sesi")
    .select("id, nama, jam_mulai, urutan")
    .eq("is_active", true)
    .order("urutan");
  const sesiAktif = (sesiRows as SesiOpsi[]) ?? [];

  // 4. Booking terbayar pada tanggal ini untuk layanan ini -> sesi_id terpakai
  const { data: booked } = await admin
    .from("booking")
    .select("sesi_id, package!inner(layanan_id), payment!inner(status_bayar)")
    .eq("tanggal", tanggal)
    .eq("package.layanan_id", layananId)
    .in("payment.status_bayar", ["dp_paid", "lunas"]);
  const sesiTerpakai = (booked ?? []).map((b) => b.sesi_id as string);

  // 5. Hari ini? buang sesi lampau
  const now = new Date();
  const isHariIni = tanggal === now.toISOString().slice(0, 10);
  const nowMinutes = isHariIni ? now.getHours() * 60 + now.getMinutes() : 0;

  return filterSesiTersedia(sesiAktif, sesiTerpakai, isBlackout, isHariIni, nowMinutes);
}
```

- [ ] **Step 5: Jalankan, pastikan LULUS**

Run: `npm run test -- sesiAvailability`
Expected: PASS (4 test).

- [ ] **Step 6: Commit**

```bash
git add src/lib/time/time.ts src/lib/booking/sesiAvailability.ts tests/unit/sesiAvailability.test.ts
git commit -m "feat(booking): getSesiTersedia + filterSesiTersedia (kapasitas per layanan+sesi+tanggal, TDD)"
```

---

## Task 2: Query katalog (landing + detail)

**Files:**
- Create: `src/lib/catalog/queries.ts`

- [ ] **Step 1: `src/lib/catalog/queries.ts`**

```ts
import { createClient } from "@/lib/supabase/server";

export type PaketCard = {
  id: string;
  nama: string;
  deskripsi: string | null;
  harga: number;
  dp_persen: number;
  diskon_returning: number;
  durasi_menit: number;
  foto_url: string | null;
};

export type LayananDenganPaket = {
  id: string;
  nama: string;
  urutan: number;
  paket: PaketCard[];
};

const PAKET_COLS =
  "id, nama, deskripsi, harga, dp_persen, diskon_returning, durasi_menit, foto_url, is_active, layanan_id";

/** Untuk landing: layanan aktif beserta paket aktifnya (urut). Layanan tanpa paket aktif dibuang. */
export async function getLayananDenganPaket(): Promise<LayananDenganPaket[]> {
  const supabase = await createClient();
  const { data: layanan } = await supabase
    .from("layanan")
    .select("id, nama, urutan")
    .eq("is_active", true)
    .order("urutan");
  if (!layanan) return [];

  const { data: paket } = await supabase
    .from("package")
    .select(PAKET_COLS)
    .eq("is_active", true)
    .order("harga");
  const semua = (paket as (PaketCard & { is_active: boolean; layanan_id: string })[]) ?? [];

  return (layanan as { id: string; nama: string; urutan: number }[])
    .map((l) => ({
      ...l,
      paket: semua.filter((p) => p.layanan_id === l.id),
    }))
    .filter((l) => l.paket.length > 0);
}

export type PackageDetail = {
  id: string;
  nama: string;
  deskripsi: string | null;
  harga: number;
  dp_persen: number;
  diskon_returning: number;
  durasi_menit: number;
  foto_url: string | null;
  layanan_id: string;
  layanan_nama: string;
  layanan_admin_wa: string;
};

/** Untuk halaman detail/booking (Plan 3): paket + layanan-nya. */
export async function getPackageById(id: string): Promise<PackageDetail | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("package")
    .select(
      "id, nama, deskripsi, harga, dp_persen, diskon_returning, durasi_menit, foto_url, layanan_id, layanan(nama, admin_wa)",
    )
    .eq("id", id)
    .eq("is_active", true)
    .maybeSingle();
  if (!data) return null;
  const layanan = data.layanan as unknown as { nama: string; admin_wa: string } | null;
  return {
    id: data.id as string,
    nama: data.nama as string,
    deskripsi: (data.deskripsi as string) ?? null,
    harga: data.harga as number,
    dp_persen: data.dp_persen as number,
    diskon_returning: data.diskon_returning as number,
    durasi_menit: data.durasi_menit as number,
    foto_url: (data.foto_url as string) ?? null,
    layanan_id: data.layanan_id as string,
    layanan_nama: layanan?.nama ?? "",
    layanan_admin_wa: layanan?.admin_wa ?? "",
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/catalog/queries.ts
git commit -m "feat(catalog): query layanan+paket utk landing & getPackageById utk detail"
```

---

## Task 3: Query master (admin)

**Files:**
- Create: `src/lib/admin/masterQueries.ts`

- [ ] **Step 1: `src/lib/admin/masterQueries.ts`**

```ts
import { createAdminClient } from "@/lib/supabase/admin";

export type LayananRow = { id: string; nama: string; admin_wa: string; urutan: number; is_active: boolean };
export type PaketRow = {
  id: string; layanan_id: string; nama: string; deskripsi: string | null;
  harga: number; diskon_returning: number; dp_persen: number; durasi_menit: number; is_active: boolean;
};
export type SesiRow = { id: string; nama: string; jam_mulai: string; urutan: number; is_active: boolean };
export type ZonaRow = { id: string; nama: string; keterangan: string | null; biaya: number; urutan: number; is_active: boolean };
export type BlackoutRow = { id: string; tanggal: string; keterangan: string | null };

export async function listLayanan(): Promise<LayananRow[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("layanan")
    .select("id, nama, admin_wa, urutan, is_active")
    .order("urutan");
  return (data as LayananRow[]) ?? [];
}

export async function listPaket(): Promise<PaketRow[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("package")
    .select("id, layanan_id, nama, deskripsi, harga, diskon_returning, dp_persen, durasi_menit, is_active")
    .order("harga");
  return (data as PaketRow[]) ?? [];
}

export async function listSesi(): Promise<SesiRow[]> {
  const admin = createAdminClient();
  const { data } = await admin.from("sesi").select("id, nama, jam_mulai, urutan, is_active").order("urutan");
  return (data as SesiRow[]) ?? [];
}

export async function listZona(): Promise<ZonaRow[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("zona_ongkos")
    .select("id, nama, keterangan, biaya, urutan, is_active")
    .order("urutan");
  return (data as ZonaRow[]) ?? [];
}

export async function listBlackout(): Promise<BlackoutRow[]> {
  const admin = createAdminClient();
  const { data } = await admin.from("blackout_date").select("id, tanggal, keterangan").order("tanggal");
  return (data as BlackoutRow[]) ?? [];
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/admin/masterQueries.ts
git commit -m "feat(admin): query master (layanan/paket/sesi/zona/blackout)"
```

---

## Task 4: Server actions master

**Files:**
- Create: `src/lib/admin/masterActions.ts`

- [ ] **Step 1: `src/lib/admin/masterActions.ts`**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";

async function guardAdmin() {
  const me = await getCurrentProfile();
  if (me?.role !== "admin") throw new Error("forbidden");
  return createAdminClient();
}

// ---- Layanan ----
export async function buatLayanan(formData: FormData) {
  const admin = await guardAdmin();
  await admin.from("layanan").insert({
    nama: String(formData.get("nama") ?? "").trim(),
    admin_wa: String(formData.get("admin_wa") ?? "").trim(),
    urutan: Number(formData.get("urutan") ?? 0),
  });
  revalidatePath("/admin/master/layanan");
}
export async function updateLayanan(formData: FormData) {
  const admin = await guardAdmin();
  await admin.from("layanan").update({
    nama: String(formData.get("nama") ?? "").trim(),
    admin_wa: String(formData.get("admin_wa") ?? "").trim(),
    urutan: Number(formData.get("urutan") ?? 0),
  }).eq("id", String(formData.get("id")));
  revalidatePath("/admin/master/layanan");
}
export async function toggleLayanan(formData: FormData) {
  const admin = await guardAdmin();
  await admin.from("layanan")
    .update({ is_active: String(formData.get("aktif")) !== "true" })
    .eq("id", String(formData.get("id")));
  revalidatePath("/admin/master/layanan");
}

// ---- Paket ----
export async function buatPaket(formData: FormData) {
  const admin = await guardAdmin();
  await admin.from("package").insert({
    layanan_id: String(formData.get("layanan_id")),
    nama: String(formData.get("nama") ?? "").trim(),
    deskripsi: String(formData.get("deskripsi") ?? "").trim() || null,
    harga: Number(formData.get("harga") ?? 0),
    diskon_returning: Number(formData.get("diskon_returning") ?? 0),
    dp_persen: Number(formData.get("dp_persen") ?? 30),
    durasi_menit: Number(formData.get("durasi_menit") ?? 0),
  });
  revalidatePath("/admin/master/paket");
}
export async function updatePaket(formData: FormData) {
  const admin = await guardAdmin();
  await admin.from("package").update({
    layanan_id: String(formData.get("layanan_id")),
    nama: String(formData.get("nama") ?? "").trim(),
    deskripsi: String(formData.get("deskripsi") ?? "").trim() || null,
    harga: Number(formData.get("harga") ?? 0),
    diskon_returning: Number(formData.get("diskon_returning") ?? 0),
    dp_persen: Number(formData.get("dp_persen") ?? 30),
    durasi_menit: Number(formData.get("durasi_menit") ?? 0),
  }).eq("id", String(formData.get("id")));
  revalidatePath("/admin/master/paket");
}
export async function togglePaket(formData: FormData) {
  const admin = await guardAdmin();
  await admin.from("package")
    .update({ is_active: String(formData.get("aktif")) !== "true" })
    .eq("id", String(formData.get("id")));
  revalidatePath("/admin/master/paket");
}

// ---- Sesi ----
export async function buatSesi(formData: FormData) {
  const admin = await guardAdmin();
  await admin.from("sesi").insert({
    nama: String(formData.get("nama") ?? "").trim(),
    jam_mulai: String(formData.get("jam_mulai") ?? "09:00"),
    urutan: Number(formData.get("urutan") ?? 0),
  });
  revalidatePath("/admin/master/sesi");
}
export async function updateSesi(formData: FormData) {
  const admin = await guardAdmin();
  await admin.from("sesi").update({
    nama: String(formData.get("nama") ?? "").trim(),
    jam_mulai: String(formData.get("jam_mulai") ?? "09:00"),
    urutan: Number(formData.get("urutan") ?? 0),
  }).eq("id", String(formData.get("id")));
  revalidatePath("/admin/master/sesi");
}
export async function toggleSesi(formData: FormData) {
  const admin = await guardAdmin();
  await admin.from("sesi")
    .update({ is_active: String(formData.get("aktif")) !== "true" })
    .eq("id", String(formData.get("id")));
  revalidatePath("/admin/master/sesi");
}

// ---- Zona ongkos ----
export async function buatZona(formData: FormData) {
  const admin = await guardAdmin();
  await admin.from("zona_ongkos").insert({
    nama: String(formData.get("nama") ?? "").trim(),
    keterangan: String(formData.get("keterangan") ?? "").trim() || null,
    biaya: Number(formData.get("biaya") ?? 0),
    urutan: Number(formData.get("urutan") ?? 0),
  });
  revalidatePath("/admin/master/zona");
}
export async function updateZona(formData: FormData) {
  const admin = await guardAdmin();
  await admin.from("zona_ongkos").update({
    nama: String(formData.get("nama") ?? "").trim(),
    keterangan: String(formData.get("keterangan") ?? "").trim() || null,
    biaya: Number(formData.get("biaya") ?? 0),
    urutan: Number(formData.get("urutan") ?? 0),
  }).eq("id", String(formData.get("id")));
  revalidatePath("/admin/master/zona");
}
export async function toggleZona(formData: FormData) {
  const admin = await guardAdmin();
  await admin.from("zona_ongkos")
    .update({ is_active: String(formData.get("aktif")) !== "true" })
    .eq("id", String(formData.get("id")));
  revalidatePath("/admin/master/zona");
}

// ---- Blackout (hard delete; tak direferensi FK) ----
export async function buatBlackout(formData: FormData) {
  const admin = await guardAdmin();
  await admin.from("blackout_date").insert({
    tanggal: String(formData.get("tanggal") ?? ""),
    keterangan: String(formData.get("keterangan") ?? "").trim() || null,
  });
  revalidatePath("/admin/master/blackout");
}
export async function hapusBlackout(formData: FormData) {
  const admin = await guardAdmin();
  await admin.from("blackout_date").delete().eq("id", String(formData.get("id")));
  revalidatePath("/admin/master/blackout");
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/admin/masterActions.ts
git commit -m "feat(admin): server actions CRUD master (guardAdmin + revalidatePath)"
```

---

## Task 5: Hub master + halaman Layanan

**Files:**
- Create: `src/app/admin/master/page.tsx`, `src/app/admin/master/layanan/page.tsx`
- Modify: `src/app/admin/page.tsx`

- [ ] **Step 1: `src/app/admin/master/page.tsx`**

```tsx
import Link from "next/link";

const MENU = [
  { href: "/admin/master/layanan", label: "Layanan" },
  { href: "/admin/master/paket", label: "Paket" },
  { href: "/admin/master/sesi", label: "Sesi" },
  { href: "/admin/master/zona", label: "Zona Ongkos" },
  { href: "/admin/master/blackout", label: "Blackout Date" },
];

export default function MasterHubPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Master Data</h1>
        <Link href="/admin" className="text-sm text-slate-500 underline">← Dashboard</Link>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {MENU.map((m) => (
          <Link key={m.href} href={m.href}
            className="flex h-20 items-center justify-center rounded-lg border border-slate-200 bg-white text-center font-medium hover:bg-slate-50">
            {m.label}
          </Link>
        ))}
      </div>
    </main>
  );
}
```

- [ ] **Step 2: `src/app/admin/master/layanan/page.tsx`**

```tsx
import Link from "next/link";
import { listLayanan } from "@/lib/admin/masterQueries";
import { buatLayanan, updateLayanan, toggleLayanan } from "@/lib/admin/masterActions";

export const dynamic = "force-dynamic";
const inp = "rounded border border-slate-300 p-2";

export default async function MasterLayananPage() {
  const rows = await listLayanan();
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Master Layanan</h1>
        <Link href="/admin/master" className="text-sm text-slate-500 underline">← Master</Link>
      </div>

      <form action={buatLayanan} className="mt-4 grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-white p-4">
        <input name="nama" placeholder="Nama layanan" className={`col-span-2 ${inp}`} required />
        <input name="admin_wa" placeholder="No WA admin (62…)" className={inp} required />
        <input name="urutan" type="number" placeholder="Urutan" className={inp} defaultValue={0} />
        <button className="col-span-2 h-11 rounded bg-slate-800 px-4 text-white">Tambah Layanan</button>
      </form>

      <div className="mt-4 flex flex-col gap-3">
        {rows.map((r) => (
          <div key={r.id} className="rounded border border-slate-200 bg-white p-3">
            <form action={updateLayanan} className="grid grid-cols-2 gap-2">
              <input type="hidden" name="id" value={r.id} />
              <input name="nama" defaultValue={r.nama} className={`col-span-2 ${inp}`} required />
              <input name="admin_wa" defaultValue={r.admin_wa} className={inp} required />
              <input name="urutan" type="number" defaultValue={r.urutan} className={inp} />
              <div className="col-span-2 flex items-center gap-2">
                <button className="h-9 rounded bg-slate-800 px-3 text-sm text-white">Simpan</button>
                {!r.is_active && <span className="text-xs text-slate-400">(nonaktif)</span>}
              </div>
            </form>
            <form action={toggleLayanan} className="mt-2">
              <input type="hidden" name="id" value={r.id} />
              <input type="hidden" name="aktif" value={String(r.is_active)} />
              <button className="h-8 rounded border border-slate-300 px-3 text-xs">
                {r.is_active ? "Nonaktifkan" : "Aktifkan"}
              </button>
            </form>
          </div>
        ))}
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Modifikasi `src/app/admin/page.tsx`** — tambah link ke master. Ganti seluruh isi file dengan:

```tsx
import Link from "next/link";

export default function AdminHome() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold text-slate-800">Panel Admin</h1>
      <p className="mt-2 text-slate-500">Kelola data & transaksi Ruang Baby Happy.</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link href="/admin/master" className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-bold text-white">Master Data</Link>
        <span className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-400">Transaksi (Plan 4)</span>
      </div>
      <form action="/logout" method="post" className="mt-6">
        <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700">Keluar</button>
      </form>
    </main>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/master/page.tsx src/app/admin/master/layanan/page.tsx src/app/admin/page.tsx
git commit -m "feat(admin): hub master + halaman Layanan + link dari dashboard"
```

---

## Task 6: Halaman master Paket

**Files:**
- Create: `src/app/admin/master/paket/page.tsx`

- [ ] **Step 1: `src/app/admin/master/paket/page.tsx`** (dropdown layanan + kolom diskon/dp_persen)

```tsx
import Link from "next/link";
import { listPaket, listLayanan } from "@/lib/admin/masterQueries";
import { buatPaket, updatePaket, togglePaket } from "@/lib/admin/masterActions";
import { formatRupiah } from "@/lib/format/rupiah";

export const dynamic = "force-dynamic";
const inp = "rounded border border-slate-300 p-2";

export default async function MasterPaketPage() {
  const [rows, layanan] = await Promise.all([listPaket(), listLayanan()]);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Master Paket</h1>
        <Link href="/admin/master" className="text-sm text-slate-500 underline">← Master</Link>
      </div>

      <form action={buatPaket} className="mt-4 grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-white p-4">
        <select name="layanan_id" className={`col-span-2 ${inp}`} required defaultValue="">
          <option value="" disabled>Pilih layanan…</option>
          {layanan.map((l) => <option key={l.id} value={l.id}>{l.nama}</option>)}
        </select>
        <input name="nama" placeholder="Nama paket" className={`col-span-2 ${inp}`} required />
        <input name="deskripsi" placeholder="Deskripsi" className={`col-span-2 ${inp}`} />
        <input name="harga" type="number" placeholder="Harga" className={inp} required />
        <input name="durasi_menit" type="number" placeholder="Durasi (menit)" className={inp} required />
        <input name="diskon_returning" type="number" placeholder="Diskon pelanggan lama (Rp)" className={inp} defaultValue={0} />
        <input name="dp_persen" type="number" placeholder="DP %" className={inp} defaultValue={30} />
        <button className="col-span-2 h-11 rounded bg-slate-800 px-4 text-white">Tambah Paket</button>
      </form>

      <div className="mt-4 flex flex-col gap-3">
        {rows.map((r) => (
          <div key={r.id} className="rounded border border-slate-200 bg-white p-3">
            <form action={updatePaket} className="grid grid-cols-2 gap-2">
              <input type="hidden" name="id" value={r.id} />
              <select name="layanan_id" className={`col-span-2 ${inp}`} required defaultValue={r.layanan_id}>
                {layanan.map((l) => <option key={l.id} value={l.id}>{l.nama}</option>)}
              </select>
              <input name="nama" defaultValue={r.nama} className={`col-span-2 ${inp}`} required />
              <input name="deskripsi" defaultValue={r.deskripsi ?? ""} placeholder="Deskripsi" className={`col-span-2 ${inp}`} />
              <input name="harga" type="number" defaultValue={r.harga} className={inp} required />
              <input name="durasi_menit" type="number" defaultValue={r.durasi_menit} className={inp} required />
              <input name="diskon_returning" type="number" defaultValue={r.diskon_returning} className={inp} />
              <input name="dp_persen" type="number" defaultValue={r.dp_persen} className={inp} />
              <div className="col-span-2 flex items-center gap-2">
                <button className="h-9 rounded bg-slate-800 px-3 text-sm text-white">Simpan</button>
                <span className="text-xs text-slate-500">
                  {formatRupiah(r.harga)} · DP {r.dp_persen}% {!r.is_active && "· (nonaktif)"}
                </span>
              </div>
            </form>
            <form action={togglePaket} className="mt-2">
              <input type="hidden" name="id" value={r.id} />
              <input type="hidden" name="aktif" value={String(r.is_active)} />
              <button className="h-8 rounded border border-slate-300 px-3 text-xs">
                {r.is_active ? "Nonaktifkan" : "Aktifkan"}
              </button>
            </form>
          </div>
        ))}
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/admin/master/paket/page.tsx
git commit -m "feat(admin): halaman master Paket (dropdown layanan, diskon, dp_persen)"
```

---

## Task 7: Halaman master Sesi, Zona, Blackout

**Files:**
- Create: `src/app/admin/master/sesi/page.tsx`, `src/app/admin/master/zona/page.tsx`, `src/app/admin/master/blackout/page.tsx`

- [ ] **Step 1: `src/app/admin/master/sesi/page.tsx`**

```tsx
import Link from "next/link";
import { listSesi } from "@/lib/admin/masterQueries";
import { buatSesi, updateSesi, toggleSesi } from "@/lib/admin/masterActions";

export const dynamic = "force-dynamic";
const inp = "rounded border border-slate-300 p-2";

export default async function MasterSesiPage() {
  const rows = await listSesi();
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Master Sesi</h1>
        <Link href="/admin/master" className="text-sm text-slate-500 underline">← Master</Link>
      </div>

      <form action={buatSesi} className="mt-4 grid grid-cols-3 gap-3 rounded-lg border border-slate-200 bg-white p-4">
        <input name="nama" placeholder="Nama (Sesi 3)" className={inp} required />
        <input name="jam_mulai" type="time" className={inp} required defaultValue="09:00" />
        <input name="urutan" type="number" placeholder="Urutan" className={inp} defaultValue={0} />
        <button className="col-span-3 h-11 rounded bg-slate-800 px-4 text-white">Tambah Sesi</button>
      </form>

      <div className="mt-4 flex flex-col gap-3">
        {rows.map((r) => (
          <div key={r.id} className="rounded border border-slate-200 bg-white p-3">
            <form action={updateSesi} className="grid grid-cols-3 gap-2">
              <input type="hidden" name="id" value={r.id} />
              <input name="nama" defaultValue={r.nama} className={inp} required />
              <input name="jam_mulai" type="time" defaultValue={r.jam_mulai.slice(0, 5)} className={inp} required />
              <input name="urutan" type="number" defaultValue={r.urutan} className={inp} />
              <div className="col-span-3 flex items-center gap-2">
                <button className="h-9 rounded bg-slate-800 px-3 text-sm text-white">Simpan</button>
                {!r.is_active && <span className="text-xs text-slate-400">(nonaktif)</span>}
              </div>
            </form>
            <form action={toggleSesi} className="mt-2">
              <input type="hidden" name="id" value={r.id} />
              <input type="hidden" name="aktif" value={String(r.is_active)} />
              <button className="h-8 rounded border border-slate-300 px-3 text-xs">
                {r.is_active ? "Nonaktifkan" : "Aktifkan"}
              </button>
            </form>
          </div>
        ))}
      </div>
    </main>
  );
}
```

- [ ] **Step 2: `src/app/admin/master/zona/page.tsx`**

```tsx
import Link from "next/link";
import { listZona } from "@/lib/admin/masterQueries";
import { buatZona, updateZona, toggleZona } from "@/lib/admin/masterActions";
import { formatRupiah } from "@/lib/format/rupiah";

export const dynamic = "force-dynamic";
const inp = "rounded border border-slate-300 p-2";

export default async function MasterZonaPage() {
  const rows = await listZona();
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Master Zona Ongkos</h1>
        <Link href="/admin/master" className="text-sm text-slate-500 underline">← Master</Link>
      </div>

      <form action={buatZona} className="mt-4 grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-white p-4">
        <input name="nama" placeholder="Nama (Zona 4)" className={inp} required />
        <input name="keterangan" placeholder="Keterangan (20–30 km)" className={inp} />
        <input name="biaya" type="number" placeholder="Biaya (Rp)" className={inp} required />
        <input name="urutan" type="number" placeholder="Urutan" className={inp} defaultValue={0} />
        <button className="col-span-2 h-11 rounded bg-slate-800 px-4 text-white">Tambah Zona</button>
      </form>

      <div className="mt-4 flex flex-col gap-3">
        {rows.map((r) => (
          <div key={r.id} className="rounded border border-slate-200 bg-white p-3">
            <form action={updateZona} className="grid grid-cols-2 gap-2">
              <input type="hidden" name="id" value={r.id} />
              <input name="nama" defaultValue={r.nama} className={inp} required />
              <input name="keterangan" defaultValue={r.keterangan ?? ""} placeholder="Keterangan" className={inp} />
              <input name="biaya" type="number" defaultValue={r.biaya} className={inp} required />
              <input name="urutan" type="number" defaultValue={r.urutan} className={inp} />
              <div className="col-span-2 flex items-center gap-2">
                <button className="h-9 rounded bg-slate-800 px-3 text-sm text-white">Simpan</button>
                <span className="text-xs text-slate-500">{formatRupiah(r.biaya)} {!r.is_active && "· (nonaktif)"}</span>
              </div>
            </form>
            <form action={toggleZona} className="mt-2">
              <input type="hidden" name="id" value={r.id} />
              <input type="hidden" name="aktif" value={String(r.is_active)} />
              <button className="h-8 rounded border border-slate-300 px-3 text-xs">
                {r.is_active ? "Nonaktifkan" : "Aktifkan"}
              </button>
            </form>
          </div>
        ))}
      </div>
    </main>
  );
}
```

- [ ] **Step 3: `src/app/admin/master/blackout/page.tsx`**

```tsx
import Link from "next/link";
import { listBlackout } from "@/lib/admin/masterQueries";
import { buatBlackout, hapusBlackout } from "@/lib/admin/masterActions";

export const dynamic = "force-dynamic";
const inp = "rounded border border-slate-300 p-2";

export default async function MasterBlackoutPage() {
  const rows = await listBlackout();
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Master Blackout (Tutup)</h1>
        <Link href="/admin/master" className="text-sm text-slate-500 underline">← Master</Link>
      </div>

      <form action={buatBlackout} className="mt-4 grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-white p-4">
        <input name="tanggal" type="date" className={inp} required />
        <input name="keterangan" placeholder="Keterangan (Libur)" className={inp} />
        <button className="col-span-2 h-11 rounded bg-slate-800 px-4 text-white">Tambah Tanggal Tutup</button>
      </form>

      <div className="mt-4 flex flex-col gap-2">
        {rows.map((r) => (
          <div key={r.id} className="flex items-center justify-between rounded border border-slate-200 bg-white p-3">
            <span className="text-sm font-medium text-slate-700">{r.tanggal} {r.keterangan && `· ${r.keterangan}`}</span>
            <form action={hapusBlackout}>
              <input type="hidden" name="id" value={r.id} />
              <button className="h-8 rounded border border-red-300 px-3 text-xs text-red-600">Hapus</button>
            </form>
          </div>
        ))}
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/master/sesi/page.tsx src/app/admin/master/zona/page.tsx src/app/admin/master/blackout/page.tsx
git commit -m "feat(admin): halaman master Sesi, Zona, Blackout"
```

---

## Task 8: Landing menampilkan paket per layanan

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Ganti seluruh isi `src/app/page.tsx`**

```tsx
import Link from "next/link";
import PublicShell from "@/components/public/PublicShell";
import { brand } from "@/lib/brand";
import { btnGrad, btnOutline } from "@/components/ui/buttons";
import { getLayananDenganPaket } from "@/lib/catalog/queries";
import { formatRupiah } from "@/lib/format/rupiah";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const layanan = await getLayananDenganPaket();
  return (
    <PublicShell>
      <main>
        <section className="grad-soft">
          <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
            <span className="inline-block rounded-full bg-white px-3 py-1 text-xs font-bold shadow-sm">
              📷 Baby &amp; Kids Photo · {brand.kota}
            </span>
            <h1 className="mt-4 font-display text-4xl font-extrabold leading-tight">
              Abadikan momen <span className="text-grad">si kecil</span> ✨
            </h1>
            <p className="mt-3 font-semibold text-foreground/60">{brand.tagline}</p>
            <div className="mt-6 flex justify-center gap-3">
              <Link href="#paket" className={btnGrad}>Lihat Paket</Link>
              <Link href="/login" className={btnOutline}>Masuk</Link>
            </div>
          </div>
        </section>

        <section id="paket" className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
          <h2 className="font-display text-2xl font-extrabold">Pilih Layanan &amp; Paket</h2>
          {layanan.length === 0 && (
            <p className="mt-4 text-foreground/50">Belum ada paket. (Admin: tambahkan di Master.)</p>
          )}
          {layanan.map((l) => (
            <div key={l.id} className="mt-8">
              <h3 className="text-xs font-extrabold uppercase tracking-wide text-pink-500">{l.nama}</h3>
              <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {l.paket.map((p) => (
                  <div key={p.id} className="rounded-3xl bg-white p-4 shadow-sm">
                    <div className="font-bold">{p.nama}</div>
                    {p.deskripsi && <div className="mt-1 text-sm text-foreground/55">{p.deskripsi}</div>}
                    <div className="mt-1 text-xs text-foreground/45">±{p.durasi_menit} menit</div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="font-display text-lg font-extrabold text-pink-500">{formatRupiah(p.harga)}</span>
                      <Link href={`/paket/${p.id}`} className="rounded-full bg-grad px-4 py-2 text-xs font-bold text-white">
                        Booking →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      </main>
    </PublicShell>
  );
}
```

> Catatan: kartu paket menaut ke `/paket/[id]` yang baru dibuat di Plan 3 (sementara 404 — itu wajar; tidak diklik di test Plan 2).

- [ ] **Step 2: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat(landing): tampilkan paket dikelompokkan per layanan"
```

---

## Task 9: E2E master + landing, verifikasi build & test

**Files:**
- Create: `tests/e2e/master.spec.ts`

- [ ] **Step 1: `tests/e2e/master.spec.ts`** (login admin via UI, lalu CRUD layanan & paket; self-cleaning via nonaktifkan)

```ts
import { test, expect } from "@playwright/test";

const ADMIN_EMAIL = "admin@ruangbabyhappy.com";
const ADMIN_PASS = "Admin12345!";

async function loginAdmin(page) {
  await page.goto("/login");
  await page.getByPlaceholder("Email").fill(ADMIN_EMAIL);
  await page.getByPlaceholder("Password").fill(ADMIN_PASS);
  await page.getByRole("button", { name: /Masuk/i }).click();
  await expect(page).toHaveURL(/\/admin/);
}

test("admin bisa buka hub master & daftar layanan tampil", async ({ page }) => {
  await loginAdmin(page);
  await page.goto("/admin/master/layanan");
  await expect(page.getByRole("heading", { name: /Master Layanan/i })).toBeVisible();
  // Seed: Newborn ada. (CATATAN: Playwright TIDAK punya getByDisplayValue — itu Testing Library.
  // Pakai selektor atribut value; input ber-defaultValue merender value attribute di SSR.)
  await expect(page.locator('input[value="Newborn"]')).toBeVisible();
});

test("admin tambah paket uji lalu menonaktifkannya (self-clean)", async ({ page }) => {
  await loginAdmin(page);
  await page.goto("/admin/master/paket");
  const namaUji = `PAKET-UJI-${Date.now()}`;
  await page.locator('select[name="layanan_id"]').first().selectOption({ index: 1 });
  await page.locator('input[name="nama"]').first().fill(namaUji);
  await page.locator('input[name="harga"]').first().fill("123456");
  await page.locator('input[name="durasi_menit"]').first().fill("60");
  await page.getByRole("button", { name: /Tambah Paket/i }).click();
  await expect(page.locator(`input[value="${namaUji}"]`)).toBeVisible();

  // Self-clean: nonaktifkan paket uji (tombol toggle pada kartu yang punya nama itu)
  const kartu = page.locator("div.rounded.border", { has: page.locator(`input[value="${namaUji}"]`) });
  await kartu.getByRole("button", { name: /Nonaktifkan/i }).click();
  await expect(kartu.getByRole("button", { name: /Aktifkan/i })).toBeVisible();
});
```

> Catatan: paket uji hanya **dinonaktifkan** (soft) — tak menghapus baris, aman & tak mengotori landing (landing hanya tampilkan `is_active=true`).

- [ ] **Step 2: Jalankan unit test penuh**

Run: `npm run test`
Expected: PASS (`rupiah` + `sesiAvailability`).

- [ ] **Step 3: Verifikasi build**

Run: `npm run build`
Expected: sukses; route master (`/admin/master`, `/admin/master/layanan`, `/paket`-belum) compile. Bila Turbopack timeout transien (seperti Plan 1), ulangi `npm run build`.

- [ ] **Step 4: Jalankan E2E master (+ smoke regресi)**

Run: `npm run test:e2e -- master smoke`
Expected: smoke 6 + master 4 (2 test × 2 project) PASS — regresi smoke + master baru. (Butuh dev server + `.env.local` — sudah ada.)

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/master.spec.ts
git commit -m "test(e2e): master layanan & paket (CRUD + self-clean)"
```

---

## Self-Review (plan vs spec)

- **Master (spec §9):** layanan (+admin_wa) ✓, paket (+layanan, diskon_returning, dp_persen, durasi) ✓, sesi (nama+jam) ✓, zona_ongkos ✓, blackout ✓. (galeri & customer master → Plan 4/5.)
- **Ketersediaan sesi (spec §4):** kapasitas per (layanan, sesi, tanggal) via join `package.layanan_id` + `payment.status_bayar in (dp_paid,lunas)`; blackout & buang sesi lampau ✓. Fungsi murni `filterSesiTersedia` di-TDD ✓.
- **Landing per layanan (spec §8):** `getLayananDenganPaket` + render kelompok ✓ (tema penuh Plan 5).
- **getPackageById** untuk Plan 3 (booking) menyertakan `dp_persen`, `diskon_returning`, `layanan_admin_wa` (routing WA) ✓.
- **Delete master:** soft (toggle) untuk yang ber-FK; hard untuk blackout — dicatat sebagai penyesuaian FK-safe dari spec.
- **Tidak ada placeholder kode.** Catatan eksplisit: link `/paket/[id]` aktif di Plan 3 (sementara 404, tak diklik di test Plan 2).
- **Konsistensi tipe:** `PaketRow`/`PaketCard`/`PackageDetail` konsisten kolom (`dp_persen`, `diskon_returning`); action field names cocok dgn `name=` form.
```
