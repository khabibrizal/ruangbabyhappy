# Ruang Baby Happy — Plan 6: Enhancements & Fixes

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development atau superpowers:executing-plans. Steps pakai checkbox (`- [ ]`).

**Goal:** (1) Master **Galeri** (upload + kompres) tampil di landing; (2) filter **status pengerjaan** di Transaksi (status bayar & rentang tanggal sudah ada); (3) **Kalender Schedule** admin (semua booking per sesi, nama pemesan, klik→detail, back→kalender); (4) fix **Navbar auth-aware** (sudah login tetap muncul Login/Daftar — harusnya Hi {nama} + Transaksi + Keluar); (5) **halaman detail member** (read-only: stepper, rincian, invoice, WA); (6) **return-URL** login (balik ke halaman booking); (7) **feedback loading** di navigasi & submit.

**Architecture:** Lanjutan Plan 1–4. Galeri pola booking-studio (bucket publik `galeri` + sharp WebP + tabel `gallery`). Navbar jadi server component async (baca `getCurrentProfile`). Loading via `loading.tsx` per segmen + komponen `SubmitButton` (`useFormStatus`).

**Tech Stack:** Next.js 16, Supabase Storage, sharp, Vitest, Playwright.

**Prasyarat:** Plan 4 selesai (commit ...8b0676d). **1 langkah manual SQL** (Task 1 Step 1: tabel `gallery`). Bucket `galeri` dibuat via REST (Task 1 Step 2). Akun: admin/member seperti sebelumnya.

> **GOTCHA E2E:** UA non-browser utk setup REST (`userAgent:"rbh-e2e-setup"`); cast nested-select PostgREST; selektor `input[value=...]`; kill zombie port 3000/3001 sebelum build/E2E; build Turbopack kadang timeout (ulangi).

---

## File Structure (Plan 6)

```
supabase/migrations/0004_gallery.sql        # tabel gallery + RLS (bucket via REST)
src/lib/gallery/queries.ts                  # getGaleri
src/lib/admin/masterActions.ts              # (+ uploadGaleri, hapusGaleri)
src/app/admin/master/galeri/page.tsx
src/app/admin/master/page.tsx               # (+ menu Galeri)
src/components/public/GalleryStrip.tsx
src/app/page.tsx                            # (+ GalleryStrip)
src/components/public/Navbar.tsx            # (ganti) auth-aware
src/lib/booking/queries.ts                  # (+ filter status_pengerjaan, + listJadwalBulan)
src/app/admin/transaksi/page.tsx            # (+ filter status pengerjaan)
src/app/admin/schedule/page.tsx             # kalender
src/app/admin/transaksi/[kode]/page.tsx     # (ganti) back ref=jadwal + carry hidden
src/lib/booking/adminPayment.ts             # (+ navSuffix ref=jadwal)
src/app/member/queries.ts                   # (+ getMyBookingDetail)
src/app/member/[kode]/page.tsx              # detail member
src/app/member/page.tsx                     # (ganti) link ke /member/[kode]
src/app/paket/[id]/page.tsx                 # (ganti) gate login pakai ?next
src/app/login/actions.ts                    # (ganti) honor ?next
src/components/ui/SubmitButton.tsx          # pending spinner
src/components/ui/Spinner.tsx               # spinner kecil
src/app/loading.tsx, src/app/admin/loading.tsx, src/app/member/loading.tsx,
src/app/paket/[id]/loading.tsx, src/app/booking/[kode]/loading.tsx
tests/e2e/plan6.spec.ts
```

---

## Task 1: Galeri — migration, bucket, query, actions, halaman admin

**Files:**
- Create: `supabase/migrations/0004_gallery.sql`, `src/lib/gallery/queries.ts`, `src/app/admin/master/galeri/page.tsx`
- Modify: `src/lib/admin/masterActions.ts` (tambah upload/hapus + import sharp), `src/app/admin/master/page.tsx` (menu Galeri)

- [ ] **Step 1 (MANUAL SQL — user jalankan di Supabase SQL Editor):** `supabase/migrations/0004_gallery.sql`

```sql
create table public.gallery (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  created_at timestamptz not null default now()
);
alter table public.gallery enable row level security;
create policy gallery_read on public.gallery for select using (true);
```
(Tulis file ini ke repo; isinya dijalankan manual. Bucket publik `galeri` dibuat di Step 2 via REST.)

- [ ] **Step 2: Buat bucket publik `galeri` via REST** (di mesin dgn `.env.local`):

```bash
cd /d/ruangbabyhappy
URL=$(grep NEXT_PUBLIC_SUPABASE_URL .env.local|cut -d= -f2|tr -d '\r'); KEY=$(grep SUPABASE_SERVICE_ROLE_KEY .env.local|cut -d= -f2|tr -d '\r')
curl -s -X POST "$URL/storage/v1/bucket" -H "apikey: $KEY" -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" -d '{"id":"galeri","name":"galeri","public":true}'; echo
```
Expected: `{"name":"galeri"}` atau duplicate (OK).

- [ ] **Step 3: `src/lib/gallery/queries.ts`**

```ts
import { createClient } from "@/lib/supabase/server";

export type GaleriRow = { id: string; url: string };

/** Daftar foto galeri (RLS public read), urut waktu unggah. */
export async function getGaleri(): Promise<GaleriRow[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("gallery").select("id, url").order("created_at", { ascending: true });
  return (data as GaleriRow[]) ?? [];
}
```

- [ ] **Step 4: Tambah di akhir `src/lib/admin/masterActions.ts`** (import sharp di atas + 2 fungsi). Tambahkan baris import setelah import yang sudah ada:

```ts
import sharp from "sharp";
```
Lalu tambahkan di akhir file:

```ts
// ---- Galeri ----
export async function uploadGaleri(formData: FormData) {
  const admin = await guardAdmin();
  const file = formData.get("gambar");
  if (!(file instanceof File) || file.size === 0) throw new Error("Gambar wajib diupload");
  if (!file.type.startsWith("image/")) throw new Error("File harus gambar");
  if (file.size > 8_000_000) throw new Error("Ukuran maksimal 8MB");

  const masuk = Buffer.from(await file.arrayBuffer());
  const webp = await sharp(masuk)
    .rotate()
    .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();

  const path = `g-${crypto.randomUUID()}.webp`;
  const { error: upErr } = await admin.storage.from("galeri").upload(path, webp, { contentType: "image/webp", upsert: true });
  if (upErr) throw new Error("Gagal upload: " + upErr.message);

  const url = admin.storage.from("galeri").getPublicUrl(path).data.publicUrl;
  await admin.from("gallery").insert({ url });
  revalidatePath("/admin/master/galeri");
  revalidatePath("/");
}

export async function hapusGaleri(formData: FormData) {
  const admin = await guardAdmin();
  const id = String(formData.get("id"));
  const { data: row } = await admin.from("gallery").select("url").eq("id", id).single();
  const url = (row?.url as string) ?? "";
  const marker = "/storage/v1/object/public/galeri/";
  const i = url.indexOf(marker);
  if (i >= 0) await admin.storage.from("galeri").remove([url.slice(i + marker.length)]);
  await admin.from("gallery").delete().eq("id", id);
  revalidatePath("/admin/master/galeri");
  revalidatePath("/");
}
```

> Catatan: `guardAdmin()` & `revalidatePath` sudah ada di file (Plan 2). `crypto.randomUUID()` tersedia global di runtime Node Next.

- [ ] **Step 5: `src/app/admin/master/galeri/page.tsx`**

```tsx
import Link from "next/link";
import { getGaleri } from "@/lib/gallery/queries";
import { uploadGaleri, hapusGaleri } from "@/lib/admin/masterActions";

export const dynamic = "force-dynamic";

export default async function MasterGaleriPage() {
  const rows = await getGaleri();
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Galeri</h1>
        <Link href="/admin/master" className="text-sm text-slate-500 underline">← Master</Link>
      </div>

      <form action={uploadGaleri} className="mt-4 flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:flex-row sm:items-center">
        <input name="gambar" type="file" accept="image/*" required className="flex-1 text-sm file:mr-3 file:rounded file:border-0 file:bg-slate-800 file:px-4 file:py-2 file:text-white" />
        <button className="h-11 rounded bg-slate-800 px-4 text-white">Upload</button>
      </form>
      <p className="mt-1 text-xs text-slate-500">Gambar otomatis dikompres (WebP, maks 1600px).</p>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {rows.map((g) => (
          <div key={g.id} className="rounded-lg border border-slate-200 bg-white p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={g.url} alt="Galeri" className="aspect-[3/4] w-full rounded object-cover" />
            <form action={hapusGaleri} className="mt-2">
              <input type="hidden" name="id" value={g.id} />
              <button className="h-8 w-full rounded border border-red-300 px-3 text-xs text-red-600">Hapus</button>
            </form>
          </div>
        ))}
      </div>
    </main>
  );
}
```

- [ ] **Step 6: Tambah menu Galeri di `src/app/admin/master/page.tsx`** — pada array `MENU`, tambahkan setelah Blackout:

```tsx
  { href: "/admin/master/galeri", label: "Galeri" },
```

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/0004_gallery.sql src/lib/gallery/queries.ts src/lib/admin/masterActions.ts src/app/admin/master/galeri/page.tsx src/app/admin/master/page.tsx
git commit -m "feat(galeri): master upload+kompres (sharp) + query + menu"
```

---

## Task 2: GalleryStrip di landing

**Files:**
- Create: `src/components/public/GalleryStrip.tsx`
- Modify: `src/app/page.tsx` (sisipkan GalleryStrip sebelum section paket)

- [ ] **Step 1: `src/components/public/GalleryStrip.tsx`** (sembunyi bila kosong)

```tsx
import Image from "next/image";
import { brand } from "@/lib/brand";
import { getGaleri } from "@/lib/gallery/queries";

export default async function GalleryStrip() {
  const rows = await getGaleri();
  if (rows.length === 0) return null;
  return (
    <section id="galeri" className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <h2 className="mb-5 font-display text-2xl font-extrabold">Galeri <span className="text-grad">💕</span></h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {rows.map((g, i) => (
          <div key={g.id} className="relative aspect-[3/4] overflow-hidden rounded-2xl">
            <Image src={g.url} alt={`Galeri ${brand.nama} ${i + 1}`} fill className="object-cover" sizes="(max-width: 640px) 50vw, 25vw" />
          </div>
        ))}
        <a href={brand.igUrl} target="_blank" rel="noopener noreferrer"
          className="grid aspect-[3/4] place-items-center rounded-2xl bg-grad p-4 text-center font-bold text-white">
          Lihat semua di IG →
        </a>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Sisipkan ke `src/app/page.tsx`** — tambah import lalu render sebelum `<section id="paket">`.
  - Tambah import di atas: `import GalleryStrip from "@/components/public/GalleryStrip";`
  - Tepat sebelum baris `<section id="paket" ...>`, tambahkan: `<GalleryStrip />`

- [ ] **Step 3: Commit**

```bash
git add src/components/public/GalleryStrip.tsx src/app/page.tsx
git commit -m "feat(landing): GalleryStrip dinamis dari master galeri"
```

---

## Task 3: Navbar auth-aware (fix Login/Daftar saat sudah login)

**Files:**
- Modify: `src/components/public/Navbar.tsx` (ganti seluruh isi → server component async)

- [ ] **Step 1: Ganti `src/components/public/Navbar.tsx`**

```tsx
import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { btnGradSm, btnOutlineSm } from "@/components/ui/buttons";

export default async function Navbar() {
  const profile = await getCurrentProfile();
  return (
    <header className="sticky top-0 z-20 bg-white/80 backdrop-blur">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="font-display text-lg font-extrabold">
          Ruang Baby<span className="text-grad">Happy</span>
        </Link>
        <div className="flex items-center gap-2">
          {profile ? (
            <>
              <span className="hidden text-sm font-bold text-foreground/70 sm:inline">Hi, {profile.nama ?? "Member"}</span>
              {profile.role === "admin" ? (
                <Link href="/admin" className={btnOutlineSm}>Admin</Link>
              ) : (
                <Link href="/member" className={btnOutlineSm}>Transaksi</Link>
              )}
              <form action="/logout" method="post">
                <button className={btnGradSm}>Keluar</button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className={btnOutlineSm}>Masuk</Link>
              <Link href="/register" className={btnGradSm}>Daftar</Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
```

> Catatan: `getCurrentProfile` aman dipanggil di server component; PublicShell yang memakai Navbar otomatis ikut dinamis.

- [ ] **Step 2: Commit**

```bash
git add src/components/public/Navbar.tsx
git commit -m "fix(nav): navbar auth-aware (Hi {nama} + Transaksi/Admin + Keluar saat login)"
```

---

## Task 4: Filter status pengerjaan di Transaksi

**Files:**
- Modify: `src/lib/booking/queries.ts` (FilterTransaksi + listTransaksiAdmin), `src/app/admin/transaksi/page.tsx`

- [ ] **Step 1: Di `src/lib/booking/queries.ts`** ubah tipe `FilterTransaksi` (tambah `pengerjaan`):

```ts
export type FilterTransaksi = { status?: string; pengerjaan?: string; dari?: string; sampai?: string; page?: number };
```

- [ ] **Step 2: Di fungsi `listTransaksiAdmin`**, setelah baris `if (filter.sampai) q = q.lte("tanggal", filter.sampai);` tambahkan filter pengerjaan:

```ts
  if (filter.pengerjaan === "belum") q = q.is("status_pengerjaan", null);
  else if (filter.pengerjaan) q = q.eq("status_pengerjaan", filter.pengerjaan);
```

- [ ] **Step 3: Di `src/app/admin/transaksi/page.tsx`** — (a) baca param `pengerjaan`, (b) tambah ke `filter`, (c) tambah dropdown, (d) sertakan di `buatHref`.
  - Ubah tipe searchParams jadi: `Promise<{ status?: string; pengerjaan?: string; dari?: string; sampai?: string; page?: string }>`.
  - Ubah `const filter` jadi menyertakan `pengerjaan: sp.pengerjaan || undefined`.
  - Di `buatHref`, setelah `if (filter.status) params.set("status", filter.status);` tambah: `if (filter.pengerjaan) params.set("pengerjaan", filter.pengerjaan);`
  - Di `<form method="get">`, setelah dropdown Status (sebelum label Dari) tambahkan:

```tsx
        <label className="flex flex-col text-sm">Pengerjaan
          <select name="pengerjaan" defaultValue={filter.pengerjaan ?? ""} className="mt-1 rounded border border-slate-300 p-2">
            <option value="">Semua</option>
            <option value="belum">Belum mulai</option>
            <option value="pilih_foto">Pilih Foto</option>
            <option value="edit">Edit</option>
            <option value="cetak">Cetak</option>
            <option value="pengiriman">Pengiriman</option>
            <option value="selesai">Selesai</option>
          </select>
        </label>
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/booking/queries.ts src/app/admin/transaksi/page.tsx
git commit -m "feat(admin): filter status pengerjaan di daftar transaksi"
```

---

## Task 5: Kalender Schedule + back-to-schedule

**Files:**
- Modify: `src/lib/booking/queries.ts` (+ `listJadwalBulan` + `JadwalItem`)
- Create: `src/app/admin/schedule/page.tsx`
- Modify: `src/lib/booking/adminPayment.ts` (navSuffix + sisipkan ke 3 redirect), `src/app/admin/transaksi/[kode]/page.tsx` (back ref-aware + hidden ref/bulan), `src/app/admin/page.tsx` (+ link Jadwal)

- [ ] **Step 1: Tambah di akhir `src/lib/booking/queries.ts`**

```ts
export type JadwalItem = {
  kode_booking: string;
  tanggal: string;
  jam_mulai: string;
  sesi_nama: string;
  nama: string;
  status_bayar: string;
};

/** Booking dalam satu bulan ("YYYY-MM") untuk kalender admin (semua status). */
export async function listJadwalBulan(bulan: string): Promise<JadwalItem[]> {
  const admin = createAdminClient();
  const [y, m] = bulan.split("-").map(Number);
  const hariTerakhir = new Date(y, m, 0).getDate();
  const dari = `${bulan}-01`;
  const sampai = `${bulan}-${String(hariTerakhir).padStart(2, "0")}`;

  const { data } = await admin
    .from("booking")
    .select("kode_booking, tanggal, jam_mulai, sesi:sesi_id(nama), profile:customer_profile_id(nama), payment(status_bayar)")
    .gte("tanggal", dari)
    .lte("tanggal", sampai)
    .order("jam_mulai", { ascending: true });

  const rows = (data as unknown as {
    kode_booking: string; tanggal: string; jam_mulai: string;
    sesi: { nama: string } | null; profile: { nama: string | null } | null; payment: { status_bayar: string } | null;
  }[]) ?? [];

  return rows.map((r) => ({
    kode_booking: r.kode_booking,
    tanggal: r.tanggal,
    jam_mulai: r.jam_mulai,
    sesi_nama: r.sesi?.nama ?? "",
    nama: r.profile?.nama ?? "Member",
    status_bayar: r.payment?.status_bayar ?? "unpaid",
  }));
}
```

- [ ] **Step 2: `src/app/admin/schedule/page.tsx`**

```tsx
import Link from "next/link";
import { listJadwalBulan, type JadwalItem } from "@/lib/booking/queries";

export const dynamic = "force-dynamic";

const NAMA_BULAN = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
const HARI = ["Sen","Sel","Rab","Kam","Jum","Sab","Min"];
const WARNA: Record<string, string> = {
  unpaid: "bg-red-100 text-red-700 hover:bg-red-200",
  dp_paid: "bg-amber-100 text-amber-800 hover:bg-amber-200",
  lunas: "bg-green-100 text-green-700 hover:bg-green-200",
};

function normalisasiBulan(raw: string | undefined): string {
  if (raw && /^\d{4}-\d{2}$/.test(raw)) return raw;
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}
function geserBulan(bulan: string, delta: number): string {
  const [y, m] = bulan.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default async function SchedulePage({ searchParams }: { searchParams: Promise<{ bulan?: string }> }) {
  const { bulan: bulanParam } = await searchParams;
  const bulan = normalisasiBulan(bulanParam);
  const [tahun, bulanNo] = bulan.split("-").map(Number);

  const items = await listJadwalBulan(bulan);
  const perTanggal = new Map<string, JadwalItem[]>();
  for (const it of items) {
    const list = perTanggal.get(it.tanggal) ?? [];
    list.push(it);
    perTanggal.set(it.tanggal, list);
  }

  const jumlahHari = new Date(tahun, bulanNo, 0).getDate();
  const offsetAwal = (new Date(tahun, bulanNo - 1, 1).getDay() + 6) % 7;
  const totalBaris = Math.ceil((offsetAwal + jumlahHari) / 7) * 7;

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Jadwal</h1>
        <Link href="/admin" className="text-sm text-slate-500 underline">← Dashboard</Link>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <Link href={`/admin/schedule?bulan=${geserBulan(bulan, -1)}`} className="flex h-10 items-center rounded border border-slate-300 px-3 text-sm">← Bulan lalu</Link>
        <h2 className="text-lg font-semibold">{NAMA_BULAN[bulanNo - 1]} {tahun}</h2>
        <Link href={`/admin/schedule?bulan=${geserBulan(bulan, 1)}`} className="flex h-10 items-center rounded border border-slate-300 px-3 text-sm">Bulan depan →</Link>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 text-sm">
        {HARI.map((h) => <div key={h} className="bg-slate-50 py-2 text-center font-medium text-slate-600">{h}</div>)}
        {Array.from({ length: totalBaris }).map((_, idx) => {
          const hari = idx - offsetAwal + 1;
          if (hari < 1 || hari > jumlahHari) return <div key={idx} className="min-h-24 bg-slate-50" />;
          const key = `${bulan}-${String(hari).padStart(2, "0")}`;
          const isi = perTanggal.get(key) ?? [];
          return (
            <div key={idx} className="min-h-24 bg-white p-1.5">
              <div className="text-right text-xs text-slate-400">{hari}</div>
              <div className="mt-1 flex flex-col gap-1">
                {isi.map((it) => (
                  <Link key={it.kode_booking} href={`/admin/transaksi/${it.kode_booking}?ref=jadwal&bulan=${bulan}`}
                    title={`${it.nama} · ${it.sesi_nama}`}
                    className={`block truncate rounded px-1.5 py-0.5 text-xs transition-colors ${WARNA[it.status_bayar] ?? "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>
                    {it.sesi_nama}: {it.nama}
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-600">
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-red-100" /> Belum bayar</span>
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-amber-100" /> Sudah DP</span>
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-green-100" /> Lunas</span>
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Di `src/lib/booking/adminPayment.ts`** tambah helper navSuffix (setelah `guardAdmin`) dan sisipkan ke ketiga redirect `?ok=1`/`?error=`:

```ts
function navSuffix(formData: FormData): string {
  if (String(formData.get("ref") ?? "") !== "jadwal") return "";
  const bulan = String(formData.get("bulan") ?? "");
  return `&ref=jadwal${bulan ? `&bulan=${encodeURIComponent(bulan)}` : ""}`;
}
```
Lalu pada ketiga fungsi, ganti akhir redirect:
- `simpanDetailTransaksi`: tiap `redirect(\`/admin/transaksi/${kode}?error=...\`)` & redirect akhir `?ok=1` → tambah `${navSuffix(formData)}` sebelum backtick penutup. Contoh akhir: `redirect(\`/admin/transaksi/${kode}?ok=1${navSuffix(formData)}\`);`
- `updateStatusPengerjaan`: `redirect(\`/admin/transaksi/${kode}?ok=1${navSuffix(formData)}\`);`
- `rescheduleBooking`: redirect error & `?ok=1` → tambah `${navSuffix(formData)}`.

> Untuk error redirect yang sudah pakai template, sisipkan `${navSuffix(formData)}` tepat sebelum tanda kutip penutup string URL.

- [ ] **Step 4: Di `src/app/admin/transaksi/[kode]/page.tsx`** — back ref-aware + hidden ref/bulan di 3 form:
  - Ubah tipe searchParams: `Promise<{ error?: string; ok?: string; ref?: string; bulan?: string }>` dan destructure `ref, bulan`.
  - Ganti link back: hitung
    ```tsx
    const dariJadwal = ref === "jadwal";
    const backHref = dariJadwal ? `/admin/schedule${bulan ? `?bulan=${bulan}` : ""}` : "/admin/transaksi";
    const backLabel = dariJadwal ? "← Jadwal" : "← Transaksi";
    ```
    dan pakai `<Link href={backHref}>{backLabel}</Link>`.
  - Pada KETIGA form (`simpanDetailTransaksi`, `updateStatusPengerjaan`, `rescheduleBooking`), tambahkan hidden field setelah hidden `kode`:
    ```tsx
    {dariJadwal && <input type="hidden" name="ref" value="jadwal" />}
    {dariJadwal && bulan && <input type="hidden" name="bulan" value={bulan} />}
    ```

- [ ] **Step 5: Tambah link Jadwal di `src/app/admin/page.tsx`** — setelah link Laporan:

```tsx
        <Link href="/admin/schedule" className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-bold text-white">Jadwal</Link>
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/booking/queries.ts src/lib/booking/adminPayment.ts "src/app/admin/schedule" "src/app/admin/transaksi/[kode]/page.tsx" src/app/admin/page.tsx
git commit -m "feat(admin): kalender Jadwal (semua booking per sesi) + back-to-jadwal"
```

---

## Task 6: Halaman detail member

**Files:**
- Modify: `src/lib/member/queries.ts` (+ `getMyBookingDetail`)
- Create: `src/app/member/[kode]/page.tsx`
- Modify: `src/app/member/page.tsx` (link Detail → `/member/[kode]`)

- [ ] **Step 1: Tambah di akhir `src/lib/member/queries.ts`**

```ts
export type MemberDetail = {
  kode_booking: string;
  tanggal: string;
  jam_mulai: string;
  lokasi_sesi: string;
  alamat_sesi: string | null;
  anak_nama: string;
  anak_bb: number;
  anak_jk: string;
  status_pengerjaan: string | null;
  sesi: { nama: string } | null;
  zona: { nama: string } | null;
  package: { nama: string; layanan: { nama: string; admin_wa: string } | null } | null;
  payment: { status_bayar: string; total: number; ongkos: number; diskon: number; dp_amount: number | null } | null;
};

/** Detail 1 booking milik member (RLS membatasi ke miliknya). */
export async function getMyBookingDetail(kode: string): Promise<MemberDetail | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("booking")
    .select(
      "kode_booking, tanggal, jam_mulai, lokasi_sesi, alamat_sesi, anak_nama, anak_bb, anak_jk, status_pengerjaan, " +
        "sesi:sesi_id(nama), zona:zona_id(nama), " +
        "package:package_id(nama, layanan:layanan_id(nama, admin_wa)), " +
        "payment(status_bayar, total, ongkos, diskon, dp_amount)",
    )
    .eq("kode_booking", kode)
    .maybeSingle();
  return (data as unknown as MemberDetail) ?? null;
}
```

- [ ] **Step 2: `src/app/member/[kode]/page.tsx`**

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { getMyBookingDetail } from "@/lib/member/queries";
import { buildWaLink } from "@/lib/booking/waLink";
import { formatRupiah } from "@/lib/format/rupiah";
import Stepper from "../Stepper";

export const dynamic = "force-dynamic";
const LABEL: Record<string, string> = { unpaid: "Belum bayar", dp_paid: "DP terbayar", lunas: "Lunas" };

export default async function MemberDetailPage({ params }: { params: Promise<{ kode: string }> }) {
  const { kode } = await params;
  const b = await getMyBookingDetail(kode);
  if (!b) notFound();

  const status = b.payment?.status_bayar ?? "unpaid";
  const total = b.payment?.total ?? 0;
  const tagihan = total + (b.payment?.ongkos ?? 0) - (b.payment?.diskon ?? 0);
  const dp = b.payment?.dp_amount ?? 0;
  const sisa = status === "lunas" ? 0 : Math.max(0, tagihan - dp);
  const waUrl = buildWaLink(b.package?.layanan?.admin_wa ?? "", {
    kode: b.kode_booking, layanan: b.package?.layanan?.nama ?? "-", paket: b.package?.nama ?? "-",
    tanggal: b.tanggal, sesi: b.sesi?.nama ?? "",
  });

  return (
    <main className="mx-auto w-full max-w-md px-4 py-8 sm:px-6">
      <Link href="/member" className="text-sm text-slate-500 underline">← Transaksi</Link>
      <h1 className="mt-3 font-display text-2xl font-extrabold">{b.kode_booking}</h1>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="text-sm font-bold text-slate-600">Status Pengerjaan</div>
        <Stepper status={b.status_pengerjaan} />
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-y-1.5 rounded-2xl border border-slate-200 bg-white p-4 text-sm font-semibold">
        <dt className="text-slate-500">Layanan</dt><dd className="text-right">{b.package?.layanan?.nama ?? "-"}</dd>
        <dt className="text-slate-500">Paket</dt><dd className="text-right">{b.package?.nama ?? "-"}</dd>
        <dt className="text-slate-500">Jadwal</dt><dd className="text-right">{b.tanggal} · {b.sesi?.nama ?? ""}</dd>
        <dt className="text-slate-500">Lokasi</dt><dd className="text-right">{b.lokasi_sesi === "home" ? `Home${b.zona ? ` · ${b.zona.nama}` : ""}` : "Di Studio"}</dd>
        <dt className="text-slate-500">Anak</dt><dd className="text-right">{b.anak_nama} · {b.anak_bb}kg · {b.anak_jk}</dd>
      </dl>

      <dl className="mt-3 grid grid-cols-2 gap-y-1.5 rounded-2xl border border-slate-200 bg-white p-4 text-sm font-semibold">
        <dt className="text-slate-500">Paket</dt><dd className="text-right">{formatRupiah(total)}</dd>
        {(b.payment?.ongkos ?? 0) > 0 && (<><dt className="text-slate-500">Home Service</dt><dd className="text-right">{formatRupiah(b.payment?.ongkos)}</dd></>)}
        {(b.payment?.diskon ?? 0) > 0 && (<><dt className="text-emerald-600">Diskon</dt><dd className="text-right text-emerald-600">−{formatRupiah(b.payment?.diskon)}</dd></>)}
        <dt className="text-slate-500">Total</dt><dd className="text-right font-extrabold">{formatRupiah(tagihan)}</dd>
        <dt className="text-slate-500">DP</dt><dd className="text-right">{formatRupiah(dp)}</dd>
        <dt className="text-slate-500">Sisa</dt><dd className="text-right">{formatRupiah(sisa)}</dd>
        <dt className="text-slate-500">Status bayar</dt><dd className="text-right">{LABEL[status] ?? status}</dd>
      </dl>

      <div className="mt-4 flex gap-2">
        <a href={`/invoice/${b.kode_booking}`} target="_blank" rel="noreferrer" className="flex-1 rounded-full bg-white py-2.5 text-center text-sm font-bold ring-1 ring-black/10">Invoice</a>
        <a href={waUrl} target="_blank" rel="noreferrer" className="flex-1 rounded-full bg-green-500 py-2.5 text-center text-sm font-bold text-white">Chat Admin</a>
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Di `src/app/member/page.tsx`** ubah link "Detail" agar mengarah ke `/member/[kode]`. Ganti baris `<Link href={`/booking/${b.kode_booking}`} ...>Detail</Link>` menjadi:

```tsx
                  <Link href={`/member/${b.kode_booking}`} className="rounded-full bg-white px-3 py-1.5 ring-1 ring-black/10">Detail</Link>
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/member/queries.ts "src/app/member/[kode]" src/app/member/page.tsx
git commit -m "feat(member): halaman detail transaksi member (stepper + rincian + invoice + WA)"
```

---

## Task 7: Return-URL login (balik ke halaman booking)

**Files:**
- Modify: `src/app/paket/[id]/page.tsx` (gate login → sertakan `next`), `src/app/login/actions.ts` (honor `next`)

- [ ] **Step 1: Di `src/app/paket/[id]/page.tsx`** ganti baris redirect gate login menjadi:

```tsx
  if (!profile) redirect(`/login?next=${encodeURIComponent(`/paket/${id}`)}`);
```

- [ ] **Step 2: Di `src/app/login/actions.ts`** honor `next`. Ganti seluruh isi:

```ts
"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}${next ? `&next=${encodeURIComponent(next)}` : ""}`);
  }

  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user!.id).single();

  // Member yang datang dari halaman tertentu (mis. booking) dikembalikan ke sana.
  if (profile?.role !== "admin" && next.startsWith("/")) redirect(next);
  redirect(profile?.role === "admin" ? "/admin" : "/member");
}
```

- [ ] **Step 3: Di `src/app/login/page.tsx`** teruskan `next` sebagai hidden input. Ubah signature searchParams jadi `Promise<{ error?: string; next?: string }>`, destructure `next`, dan tambahkan di dalam `<form action={login} ...>` (setelah tag form pembuka):

```tsx
          <input type="hidden" name="next" value={next ?? ""} />
```

- [ ] **Step 4: Commit**

```bash
git add "src/app/paket/[id]/page.tsx" src/app/login/actions.ts src/app/login/page.tsx
git commit -m "fix(auth): return-URL login (balik ke halaman booking setelah masuk)"
```

---

## Task 8: Feedback loading (navigasi + submit)

**Files:**
- Create: `src/components/ui/Spinner.tsx`, `src/components/ui/SubmitButton.tsx`
- Create: `src/app/loading.tsx`, `src/app/admin/loading.tsx`, `src/app/member/loading.tsx`, `src/app/paket/[id]/loading.tsx`, `src/app/booking/[kode]/loading.tsx`
- Modify: `src/app/paket/[id]/BookingForm.tsx`, `src/app/login/page.tsx`, `src/app/register/page.tsx` (pakai SubmitButton)

- [ ] **Step 1: `src/components/ui/Spinner.tsx`**

```tsx
export default function Spinner({ label = "Memuat…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-20 text-foreground/60">
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-pink-300 border-t-pink-500" />
      <span className="text-sm font-semibold">{label}</span>
    </div>
  );
}
```

- [ ] **Step 2: `src/components/ui/SubmitButton.tsx`** (pending via useFormStatus)

```tsx
"use client";
import { useFormStatus } from "react-dom";

export default function SubmitButton({
  children, className, pendingText = "Memproses…",
}: {
  children: React.ReactNode; className?: string; pendingText?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button className={className} disabled={pending} aria-busy={pending}>
      {pending ? pendingText : children}
    </button>
  );
}
```

- [ ] **Step 3: loading.tsx (5 file)** — masing-masing render Spinner.

`src/app/loading.tsx`:
```tsx
import Spinner from "@/components/ui/Spinner";
export default function Loading() { return <Spinner />; }
```
Buat juga isi IDENTIK di: `src/app/admin/loading.tsx`, `src/app/member/loading.tsx`, `src/app/paket/[id]/loading.tsx`, `src/app/booking/[kode]/loading.tsx` (import path `@/components/ui/Spinner` sama untuk semua).

- [ ] **Step 4: Pakai SubmitButton di `src/app/paket/[id]/BookingForm.tsx`** — tambah import `import SubmitButton from "@/components/ui/SubmitButton";` lalu ganti tombol submit:
  - dari: `<button className={`${btnGrad} w-full`} disabled={!bisaSubmit}>Buat Booking 🎀</button>`
  - jadi: `<SubmitButton className={`${btnGrad} w-full`} pendingText="Mengirim booking…">Buat Booking 🎀</SubmitButton>`
  (Catatan: kehilangan disabled `!bisaSubmit` diterima — validasi tetap di server; SubmitButton fokus feedback pending.)

- [ ] **Step 5: Pakai SubmitButton di auth** — di `src/app/login/page.tsx` & `src/app/register/page.tsx`:
  - Tambah `import SubmitButton from "@/components/ui/SubmitButton";`
  - login: ganti `<button className={`${btnGrad} w-full`}>Masuk</button>` → `<SubmitButton className={`${btnGrad} w-full`} pendingText="Masuk…">Masuk</SubmitButton>`
  - register: ganti `<button className={`${btnGrad} w-full`}>Buat Akun</button>` → `<SubmitButton className={`${btnGrad} w-full`} pendingText="Mendaftar…">Buat Akun</SubmitButton>`

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/Spinner.tsx src/components/ui/SubmitButton.tsx "src/app/loading.tsx" "src/app/admin/loading.tsx" "src/app/member/loading.tsx" "src/app/paket/[id]/loading.tsx" "src/app/booking/[kode]/loading.tsx" "src/app/paket/[id]/BookingForm.tsx" src/app/login/page.tsx src/app/register/page.tsx
git commit -m "feat(ux): loading.tsx per segmen + SubmitButton (useFormStatus) di booking & auth"
```

---

## Task 9: E2E + verifikasi

**Files:**
- Create: `tests/e2e/plan6.spec.ts`

- [ ] **Step 1: `tests/e2e/plan6.spec.ts`**

```ts
import { test, expect } from "@playwright/test";

const MEMBER = { email: "member@ruangbabyhappy.com", pass: "Member12345!" };
const ADMIN = { email: "admin@ruangbabyhappy.com", pass: "Admin12345!" };

async function login(page, who: { email: string; pass: string }, re: RegExp) {
  await page.goto("/login");
  await page.getByPlaceholder("Email").fill(who.email);
  await page.getByPlaceholder("Password").fill(who.pass);
  await page.getByRole("button", { name: /^Masuk$/ }).click();
  await expect(page).toHaveURL(re);
}

test("navbar auth-aware: member login -> tampil Transaksi & Keluar (bukan Daftar)", async ({ page }) => {
  await login(page, MEMBER, /\/member/);
  await page.goto("/");
  await expect(page.getByRole("link", { name: /^Transaksi$/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Keluar$/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /^Daftar$/ })).toHaveCount(0);
});

test("admin punya menu Jadwal & Galeri", async ({ page }) => {
  await login(page, ADMIN, /\/admin/);
  await expect(page.getByRole("link", { name: /^Jadwal$/ })).toBeVisible();
  await page.goto("/admin/schedule");
  await expect(page.getByRole("heading", { name: /^Jadwal$/ })).toBeVisible();
  await page.goto("/admin/master");
  await expect(page.getByRole("link", { name: /^Galeri$/ })).toBeVisible();
  await page.goto("/admin/transaksi");
  await expect(page.locator('select[name="pengerjaan"]')).toBeVisible();
});
```

- [ ] **Step 2: Unit test** — `npm run test` → PASS (semua suite sebelumnya tetap hijau).

- [ ] **Step 3: Build** (kill zombie port dulu) — `npm run build` → sukses; route baru `/admin/schedule`, `/admin/master/galeri`, `/member/[kode]` muncul. Ulangi bila Turbopack timeout.

- [ ] **Step 4: E2E** — `npm run test:e2e -- plan6 smoke` → PASS. (Butuh tabel `gallery` + bucket `galeri` sudah dibuat; Navbar test tak butuh galeri.)

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/plan6.spec.ts
git commit -m "test(e2e): navbar auth-aware + menu Jadwal/Galeri + filter pengerjaan"
```

---

## Langkah Manual (user)
1. Jalankan `supabase/migrations/0004_gallery.sql` di SQL Editor (tabel `gallery`).
2. Bucket `galeri` dibuat via REST (Task 1 Step 2) — atau tambahkan manual di Storage (publik).

## Self-Review (vs permintaan)
- **Upload gambar di master → tampil di user:** master Galeri (sharp kompres) + GalleryStrip landing ✓.
- **Filter transaksi:** status bayar (ada) + **status pengerjaan (baru)** + rentang tanggal (ada) ✓.
- **Kalender schedule:** semua booking per sesi, nama pemesan, klik→detail, back→kalender (ref=jadwal&bulan) ✓.
- **Bug navbar member:** Navbar auth-aware → Hi {nama} + Transaksi + Keluar; tak lagi Login/Daftar saat login ✓. (Form booking memang sudah tak minta identitas; akar masalah = navbar.)
- **Detail member:** `/member/[kode]` read-only (stepper, rincian, invoice, WA), back ke list ✓.
- **Return-URL login:** `?next` → balik ke halaman booking ✓.
- **Loading feedback:** `loading.tsx` (navigasi antar route) + `SubmitButton` pending (submit form) ✓.
- Tidak ada placeholder kode; tipe konsisten; cast nested-select diterapkan.
```
