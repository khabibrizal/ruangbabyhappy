# Ruang Baby Happy — Plan 9: Multi-Vendor (fillens.picture) + Halaman Vendor

> Fitur sedang-besar. 1 migration (0007, manual). 1 app, 1 login; brand invoice & landing per vendor.

## Tujuan
- Entitas **vendor** (brand identitas + flag butuh_anak). Tiap **layanan** milik 1 vendor.
- Vendor `fillens.picture` (wedding) punya **halaman sendiri** `/v/[slug]` dgn brand & paket sendiri; order dari situ → **invoice tampil brand vendor itu** (rekening/WA tetap per layanan, dari Plan 8).
- Form booking **menyembunyikan data anak** bila `vendor.butuh_anak=false` (kolom anak dibuat nullable).
- Landing utama `/` = vendor **default (Ruang Baby Happy)** saja.

## Migration 0007 (manual SQL)
```sql
create table public.vendor (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  nama text not null,
  tagline text,
  ig text,
  alamat text,
  is_default boolean not null default false,
  butuh_anak boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.vendor enable row level security;
create policy vendor_read on public.vendor for select using (true);
create policy vendor_write on public.vendor for all using (public.is_admin()) with check (public.is_admin());

-- Vendor default (baby) + fillens.picture (wedding, tanpa data anak)
insert into public.vendor (slug, nama, tagline, ig, is_default, butuh_anak) values
  ('ruangbabyhappy', 'Ruang Baby Happy', 'imagine your little moment', 'ruangbabyhappy', true, true),
  ('fillens', 'fillens.picture', 'your wedding story', 'fillens.picture', false, false);

-- Layanan milik vendor (default = baby vendor)
alter table public.layanan add column if not exists vendor_id uuid references public.vendor (id);
update public.layanan set vendor_id = (select id from public.vendor where is_default limit 1) where vendor_id is null;

-- Data anak jadi opsional (utk layanan non-bayi)
alter table public.booking alter column anak_nama drop not null;
alter table public.booking alter column anak_bb drop not null;
alter table public.booking alter column anak_jk drop not null;
alter table public.booking drop constraint if exists booking_anak_jk_check;
alter table public.booking add constraint booking_anak_jk_check check (anak_jk is null or anak_jk in ('L','P'));
```

## Task 1 — Master Vendor (CRUD) + assign vendor ke layanan
- `src/lib/admin/masterQueries.ts`: tambah `VendorRow` + `listVendor()` (id, slug, nama, tagline, ig, alamat, is_default, butuh_anak, is_active); `LayananRow` + `listLayanan` tambah `vendor_id`.
- `src/lib/admin/masterActions.ts`: tambah `buatVendor/updateVendor/toggleVendor` (guardAdmin) + `buatLayanan/updateLayanan` terima `vendor_id`.
- `src/app/admin/master/vendor/page.tsx`: CRUD vendor (nama, slug, tagline, ig, alamat, butuh_anak checkbox).
- `src/app/admin/master/layanan/page.tsx`: tambah dropdown **Vendor** (dari listVendor) di form buat & edit.
- `src/app/admin/master/page.tsx`: tambah menu **Vendor**.
Commit.

## Task 2 — Query vendor (publik) + resolusi brand
- `src/lib/vendor/queries.ts` (baru):
  - `getVendorBySlug(slug)` → vendor + layanan aktif vendor itu beserta paket aktif (mirip getLayananDenganPaket tapi difilter vendor).
  - `getDefaultVendorLayanan()` → layanan+paket vendor default (utk landing `/`).
- `src/lib/catalog/queries.ts`:
  - `getLayananDenganPaket()` → filter ke **vendor default** (join layanan.vendor_id = default). (Landing utama hanya baby.)
  - `getPackageById` → sertakan `vendor` (nama, tagline, ig, alamat, butuh_anak, slug) via `layanan.vendor(...)`; tambah field `butuh_anak`, `vendor_nama` dst.
Commit.

## Task 3 — Halaman vendor `/v/[slug]`
- `src/app/v/[slug]/page.tsx` (server, force-dynamic): `getVendorBySlug`; bila tak ada → notFound. Header brand vendor (nama+tagline), grid paket per layanan (link `/paket/[id]`), footer vendor (IG/alamat). Self-contained (tak pakai PublicShell baby). Tema tetap pastel netral.
Commit.

## Task 4 — Booking: anak kondisional + simpan null
- `src/app/paket/[id]/page.tsx`: dari `getPackageById` ambil `butuh_anak`; teruskan ke `BookingForm` sbg prop `butuhAnak`. (Anak picker hanya bila butuhAnak.)
- `src/app/paket/[id]/BookingForm.tsx`: prop `butuhAnak: boolean`. Bila false → sembunyikan blok Data Anak + picker; field anak tak required.
- `src/lib/booking/createBooking.ts`: bila anak kosong (non-bayi) → insert `anak_nama/anak_bb/anak_jk = null`; validasi anak hanya bila ada nilai. (Sesuaikan: jangan `back("Data anak belum lengkap")` saat vendor non-bayi — kirim hidden `butuh_anak` dari form, atau cek paket→vendor.butuh_anak di server.)
  - Server: ambil paket→layanan→vendor.butuh_anak; bila butuh_anak true → validasi anak wajib; else → set null.
- `src/lib/admin/createTransaksiAdmin.ts`: sama — anak opsional bila vendor primary non-bayi.
Commit.

## Task 5 — Invoice & konfirmasi pakai brand vendor
- `src/lib/booking/queries.ts` `getDetailTransaksi`: pada `package.layanan(...)` tambah `vendor:vendor_id(nama, tagline, ig, alamat)`; sertakan di tipe + return (`vendor_nama`, dst).
- `src/app/invoice/[kode]/route.ts`: brand invoice (nama/tagline/footer ig+alamat) dari `d.vendor` (fallback `brand`); kirim ke InvoiceData (`brandNama`, `brandTagline`, `brandIg`, `brandAlamat`). Rekening tetap dari `d.layanan` (Plan 8).
- `src/lib/invoice/InvoiceDocument.tsx`: header & footer pakai `d.brandNama/brandTagline/brandIg/brandAlamat` (bukan `brand` global). InvoiceData tambah field tsb.
- `src/lib/booking/queries.ts` `getBookingByKode` + `src/app/booking/[kode]/page.tsx`: tampilkan `vendor_nama` di judul konfirmasi (bila non-default).
Commit.

## Task 6 — Verifikasi
Build hijau; isi langkah manual SQL; tambah paket wedding via Master (vendor fillens) utk uji; E2E `npm run test:e2e -- smoke plan6 transaksi-admin` hijau (kill zombie port). Cek `/v/fillens` tampil + invoice order wedding tampil "fillens.picture".

## Self-Review (vs permintaan)
- Order wedding lewat app ini ✓ (halaman vendor `/v/fillens`). Invoice tampil **fillens.picture saja** (brand vendor) ✓. Rekening/WA per layanan ✓. Data anak hilang utk wedding (butuh_anak=false) ✓. Landing utama tetap Ruang Baby Happy ✓. Satu app/login ✓.
- Tak mengubah kapasitas/diskon/DP/loyalitas. Kolom baru: vendor table, layanan.vendor_id, booking.anak_* nullable.
