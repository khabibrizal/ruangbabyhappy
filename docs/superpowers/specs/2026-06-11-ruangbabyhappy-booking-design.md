# Ruang Baby Happy — Booking Sesi Foto Bayi/Anak — Design Spec

> **Status:** Disetujui untuk masuk tahap rencana implementasi
> **Tanggal:** 2026-06-11
> **Konteks:** Project baru. Booking online sesi foto bayi/anak (cakesmash, maternity, sitter, newborn). Mengadopsi arsitektur **booking-studio** (Next.js + Supabase) dengan delta: jadwal berbasis **2 sesi/hari**, **field anak** di form, **diskon pelanggan lama**, **routing WA per layanan**, tanpa loyalitas poin, dan **desain "Baby Happy"** yang baru.

---

## 1. Tujuan

Aplikasi web untuk **booking sesi foto bayi/anak**:
- **Booking wajib registrasi/login** — hanya akun **member** & **admin** (tidak ada jalur visitor/tamu). Pemesan harus daftar dulu sebelum bisa booking.
- Jadwal harian **hanya 2 sesi** (Sesi 1 & Sesi 2), kapasitas 1 per sesi **per layanan**.
- Form menangkap data anak (nama, berat badan, jenis kelamin).
- **Pelanggan lama** otomatis mendapat potongan diskon (override admin tersedia).
- Tiap layanan punya **admin/nomor WA** sendiri untuk kontak & invoice.
- **Home service** (mayoritas sesi): lokasi pilih Di Studio / Home Service; **ongkos di luar harga paket**, berbasis **zona jarak** (master tarif), tampil sebagai rincian total ke user.
- Pembayaran **manual** (upload bukti transfer → admin verifikasi → Set Lunas); **DP `dp_persen`% per paket (default 30%)**.
- **Tracking status pengerjaan foto** (5 tahap) yang dilihat member di dashboard-nya.

### Non-goals (MVP)
WA gateway/payment gateway otomatis, **program loyalitas poin & reward** (dibuang dari basis booking-studio), **jalur booking visitor/tamu tanpa akun** (dibuang — wajib login), multi-admin dengan hak granular per role, aplikasi mobile native, lightbox/galeri terpisah.

---

## 2. Stack & Setup

Identik dengan booking-studio:
- **Next.js 16 + React 19**, **TypeScript**, **Tailwind v4**.
- **Supabase**: Postgres + Auth (email/password) + Storage. **Project Supabase baru** (data/auth/storage terpisah dari booking-studio).
- **@react-pdf/renderer** (invoice PDF on-demand), **sharp** (kompres foto galeri — runtime dependency).
- **Vitest** (unit) + **Playwright** (E2E desktop + Pixel 5).
- Lokasi: project baru `d:\ruangbabyhappy`, mem-fork struktur folder booking-studio (`src/app`, `src/lib`, `src/components`, `supabase/migrations`, `tests`).
- Logika sensitif (buat booking + validasi ketersediaan, ubah status bayar, hitung diskon) berjalan **server-side** (Server Actions, service-role). Akses ditegakkan **RLS Supabase** + cek role di action.

---

## 3. Model Data (skema fresh — `0001_init.sql`)

Mulai dari skema booking-studio, terapkan delta berikut.

### 3.1 Dibuang (vs booking-studio)
- Tabel **`reward`, `redemption`, `resource`**.
- Kolom **`profiles.total_point`**, **`package.point_reward`**, **`payment.point_granted`**.
- Logika poin pada RPC pelunasan (RPC disederhanakan: set lunas + `booking.completed` saja).
- Halaman member reward & admin redemption.

### 3.2 `profiles` (1:1 auth user)
`id, role ('member'|'admin'), nama, no_wa, alamat, email, created_at`. (Tanpa `total_point`.) **Setiap pemesan wajib punya akun member** (tidak ada visitor) — dipakai untuk identitas booking, deteksi pelanggan lama (returning) bagi diskon, dan tracking status pengerjaan.

### 3.3 `layanan` (master baru)
```sql
create table public.layanan (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  admin_wa text not null,            -- nomor WA admin tujuan (format 62…)
  urutan smallint not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
```
Seed:
| nama | admin_wa |
|---|---|
| cakesmash | 6282233684933 |
| maternity | 6282233684933 |
| sitter | 6282233684933 |
| newborn | 6285156217634 |

Admin dapat tambah/ubah layanan & nomor WA-nya di master.

### 3.4 `sesi` (master baru — pengganti operating_hours + slot jam)
```sql
create table public.sesi (
  id uuid primary key default gen_random_uuid(),
  nama text not null,                -- "Sesi 1", "Sesi 2"
  jam_mulai time not null,
  urutan smallint not null default 0,
  is_active boolean not null default true
);
```
Seed **placeholder** (jam diatur ulang oleh admin di master): `Sesi 1` = `09:00`, `Sesi 2` = `13:00`. **Kapasitas = 1 booking per (layanan, sesi, tanggal).**

### 3.5 `blackout_date`
Dipertahankan apa adanya — penutupan tanggal tertentu (libur). *(Hari libur mingguan rutin di luar cakupan MVP; cukup blackout per tanggal.)*

### 3.6 `package`
Kolom booking-studio **tanpa** `point_reward`, **tambah**:
- `layanan_id uuid not null references layanan(id)`
- `diskon_returning integer not null default 0` (Rp potongan untuk pelanggan lama)
- `dp_persen integer not null default 30` (persen DP per paket; default 30%)
- `durasi_menit` **dipertahankan** hanya untuk menghitung jam selesai (display/invoice).
Tetap ada: `nama, deskripsi, harga, foto_url, is_active`. (`dp_amount`/`dp_persen` lama diganti `dp_persen` baru.)

### 3.6b `zona_ongkos` (master baru — ongkos home service)
```sql
create table public.zona_ongkos (
  id uuid primary key default gen_random_uuid(),
  nama text not null,                -- mis. "Zona 1 (≤5 km)"
  keterangan text,                   -- rentang jarak/area
  biaya integer not null,            -- ongkos (Rp)
  urutan smallint not null default 0,
  is_active boolean not null default true
);
```
Admin kelola zona + tarifnya. Studio dapat menambah zona "Luar jangkauan / nego" (biaya 0 atau placeholder, lalu di-override admin).

### 3.7 `booking`
Ganti model slot-jam menjadi sesi + tambah field anak + status pengerjaan. **Tanpa kolom `guest_*`** (semua booking milik member); `customer_profile_id` **wajib**.
```sql
create table public.booking (
  id uuid primary key default gen_random_uuid(),
  kode_booking text not null unique,
  package_id uuid not null references package(id),
  sesi_id uuid not null references sesi(id),
  customer_profile_id uuid not null references profiles(id),
  anak_nama text not null,
  anak_bb numeric(4,1) not null,     -- berat badan anak (kg)
  anak_jk text not null check (anak_jk in ('L','P')),
  lokasi_sesi text not null default 'home'
    check (lokasi_sesi in ('studio','home')),
  zona_id uuid references zona_ongkos(id),   -- NULL bila lokasi_sesi='studio'
  alamat_sesi text,                  -- alamat home service (NULL bila di studio)
  tanggal date not null,
  jam_mulai time not null,           -- snapshot dari sesi.jam_mulai saat booking
  status_booking text not null default 'pending'
    check (status_booking in ('pending','confirmed','completed','cancelled')),
  status_pengerjaan text             -- NULL = belum mulai; lihat §3.10
    check (status_pengerjaan in ('pilih_foto','edit','cetak','pengiriman','selesai')),
  catatan text,
  created_at timestamptz not null default now()
);
```
(`resource_id`, `jam_selesai`, `guest_*` dihapus; jam selesai diturunkan dari `jam_mulai + package.durasi_menit` saat render/invoice.)

### 3.8 `payment`
Kolom booking-studio **tanpa** `point_granted`, **tambah** `diskon` & `ongkos`:
```
id, booking_id (unique), total, ongkos (int, default 0), diskon (int, default 0), dp_amount,
status_bayar ('unpaid'|'dp_paid'|'lunas'), metode, dibayar_at, dicatat_oleh, bukti_url, catatan_admin
```
- `total` = `package.harga` (baris paket).
- `ongkos` = ongkos home service (= `zona.biaya` saat booking; 0 bila di studio; admin-overridable).
- `diskon` = diskon yang diterapkan (auto/override).
- **Tagihan (grand total) = total + ongkos − diskon.**
- **DP = `Math.round((total + ongkos − diskon) × package.dp_persen / 100)`** (default 30%). Sisa = tagihan − dp, dibayar saat hari-H.

### 3.9 Storage
Dua bucket (sama pola booking-studio v2):
- `bukti-tf` (**privat**) — bukti transfer; baca via signed URL service-role.
- `galeri` (**publik**) — foto galeri landing (kompres sharp WebP ≤1600px).

### 3.10 Status pengerjaan (`booking.status_pengerjaan`)
Pipeline produksi foto, **terpisah dari status pembayaran**, urut linear:
`pilih_foto → edit → cetak → pengiriman → selesai`.
- Label tampil: **Pilih Foto · Edit · Cetak · Pengiriman · Selesai**.
- **`NULL` = belum mulai** (produksi belum jalan, mis. sesi foto belum berlangsung) → ditampilkan "Menunggu sesi foto".
- Diisi/dimajukan **oleh admin** di halaman detail transaksi (dropdown). Tidak otomatis dari status bayar.
- Ditampilkan ke **member** sebagai progress tracker (stepper) di dashboard member; admin melihat & mengubahnya di detail transaksi. (Tidak ada visitor.)

---

## 4. Ketersediaan Sesi (inti)

`getSesiTersedia(packageId, tanggal)` (service-role, kembalikan daftar sesi available):
1. Ambil paket → `layanan_id`, validasi `is_active`.
2. Bila `tanggal` ∈ `blackout_date` → kosong.
3. Bila `tanggal` < hari ini → kosong (sesi lampau dibuang bila tanggal = hari ini & jam sesi sudah lewat).
4. Ambil semua `sesi` aktif (urut `urutan`).
5. Sebuah sesi **TERISI** bila ada booking lain pada **`tanggal` + `sesi_id` yang sama, untuk paket dengan `layanan_id` sama**, ber-status pembayaran `dp_paid`/`lunas` (kapasitas 1). → buang dari daftar available.
6. Booking `pending` (belum diverifikasi) **tidak mengunci** sesi — siapa cepat diverifikasi.

Validasi dilakukan **dua kali**: saat customer submit (informatif) dan **wajib ulang di server saat admin Set Lunas / dp_paid** (penegakan final). Sama untuk `rescheduleBooking`.

---

## 5. Diskon Pelanggan Lama (kombinasi otomatis + override admin)

Semua pemesan adalah member (wajib login), jadi deteksi selalu berbasis akun.
Fungsi murni `hitungDiskon(opts: { returning: boolean; diskonReturning: number }): number`:
- `returning` = member punya **≥1 booking dengan payment `lunas`** sebelumnya.
- Member returning → diskon = `package.diskon_returning`; member pertama kali → 0.
- TDD: unit test (returning→nilai paket, first-timer→0).

Penerapan:
- `createBooking` (server): hitung `returning` dari histori lunas member yang login, set `payment.diskon` otomatis.
- **Override admin:** di halaman detail transaksi, admin dapat mengubah nilai `diskon` (kolom Rp); `dp_amount` & sisa dihitung ulang. Ditegakkan server-side (`diskon ≥ 0`, `diskon ≤ total`).

---

## 5b. Home Service, Ongkos & Total

**Lokasi sesi (pilihan user):** `Di Studio` atau `Home Service` (default Home Service — mayoritas begitu).
- `Di Studio` → `ongkos = 0`, `zona_id`/`alamat_sesi` kosong.
- `Home Service` → user **pilih zona** (`zona_ongkos`) + **isi alamat sesi**; `ongkos = zona.biaya` (snapshot ke `payment.ongkos` & `booking.ongkos`-context). Admin dapat **override** ongkos di detail transaksi (kasus luar jangkauan/nego), `dp_amount` & sisa dihitung ulang.

**Perhitungan (fungsi murni, TDD):**
- `hitungTagihan({ harga, ongkos, diskon })` = `harga + ongkos − diskon`.
- `hitungDp(tagihan, dpPersen)` = `Math.round(tagihan × dpPersen / 100)` (default `dpPersen = 30`).
- Unit test: studio→ongkos 0; home→ongkos zona; DP 30% atas total termasuk ongkos; sisa = tagihan − dp.

**Tampilan total (rincian baris)** — muncul live di form booking (saat pilih zona), halaman konfirmasi, dan invoice:
```
Paket <nama> ..................... Rp <harga>
Home Service (<zona>) ............ Rp <ongkos>     ← baris muncul hanya bila Home Service
Diskon pelanggan lama ............ −Rp <diskon>     ← baris muncul hanya bila diskon > 0
──────────────────────────────────────────────
Total ............................ Rp <tagihan>
DP (<dp_persen>%) ................ Rp <dp>
Sisa saat hari-H ................. Rp <tagihan − dp>
```

---

## 6. Routing WA per Layanan

`booking → package → layanan → layanan.admin_wa`.
- Halaman konfirmasi `/booking/[kode]`: tombol **"Chat Admin via WA"** → `wa.me/<layanan.admin_wa>` (template berisi `kode_booking`, paket, layanan, tanggal/sesi).
- Admin detail transaksi: **"Kirim Invoice WA"** → nomor `layanan.admin_wa` paket tsb (cakesmash/maternity/sitter → 0822…, newborn → 0851…).
- Helper `waLink` menerima nomor (dinormalisasi) + teks.

---

## 7. Form Booking (`/paket/[id]`)

**Wajib login** — bila belum login, halaman/aksi mengarahkan ke `/login` (atau `/register`) lebih dulu (gate di server).
Komponen `FormBooking` (client), Server Action `createBooking` (service-role, multipart):
- **Pilih:** tanggal + **Sesi 1/Sesi 2** (dari `getSesiTersedia`, ditampilkan sebagai tombol pill; sesi terisi dinonaktifkan).
- **Field anak (wajib):** `anak_nama`, `anak_bb` (kg), `anak_jk` (L/P).
- **Lokasi sesi:** pilih `Di Studio` / `Home Service`. Bila Home Service → pilih **zona** (dropdown `zona_ongkos`, tampil tarif) + **alamat sesi** (wajib). Bila Di Studio → zona/alamat disembunyikan.
- Identitas pemesan diambil dari **profil member** yang login (nama/WA/email); tidak ada field tamu.
- **Upload bukti TF wajib** (`accept="image/*"`, ≤5MB, validasi server).
- **Rincian total live** (§5b): Paket + Home Service(zona) − Diskon = Total; **DP = dp_persen%** (default 30%) dari total termasuk ongkos. Member returning → diskon sudah terpotong.
- Submit → `createBooking`: cek login, validasi sesi ulang, resolve `ongkos` dari zona (0 bila studio), hitung diskon & DP, upload bukti, insert `booking` (pending, `customer_profile_id`=member, `lokasi_sesi`/`zona_id`/`alamat_sesi`) + `payment` (`unpaid`, total, ongkos, diskon, dp), redirect `/booking/<kode>`.

---

## 8. Tampilan — "Baby Happy" (terang & lembut)

Tema baru, **kontras** dari Neon Night booking-studio:
- **Latar terang**, palet **pastel hangat** (pink/peach/mint), sudut **membulat besar**, tombol pill, font ramah, aksen ilustratif playful — sesuai foto bayi/anak.
- Token warna terpusat di `globals.css`; data brand terpusat di `src/lib/brand.ts` (**placeholder** — nama lengkap, alamat, IG, koordinat Maps, logo, nomor WA umum diisi user; foto galeri seed dari `d:\RuangBabyHappy`).
- **Halaman publik bertema ini:** `/` (landing), `/paket/[id]`, `/login`, `/register`, `/booking/[kode]`.
- **Landing:** Navbar (wordmark + Login/Daftar) → Hero → Galeri (next/image) → **Paket dikelompokkan per layanan** (cakesmash/maternity/sitter/newborn) via `getActivePackages` join layanan → Cara Booking (3 langkah) → Footer (peta embed klik-rute, IG, WA, alamat).
- **Admin & member tetap terang-fungsional** (tidak diberi tema dekoratif).
- Mobile-first (target sentuh ≥44px, tanpa scroll horizontal). Mockup visual dapat dibuat saat implementasi bila diperlukan.

---

## 9. Admin (dashboard bersama — routing WA saja)

Semua booking terlihat oleh admin mana pun (tidak ada pemisahan akses per layanan).
- **Daftar transaksi** `/admin/transaksi`: kartu menampilkan kode, layanan, paket, tanggal/sesi, data anak ringkas, **status bayar + status pengerjaan**; link **Lihat bukti TF** (signed URL).
- **Detail transaksi** `/admin/transaksi/[kode]`: data customer (member) + **data anak** + **lokasi sesi/zona/alamat** + paket/tanggal/sesi + rincian total (paket/ongkos/diskon/DP/sisa). Form edit: `dp_amount`, **`ongkos` (override)**, **`diskon` (override)**, `status` bayar (unpaid/dp_paid/lunas) — Set Lunas memvalidasi kapasitas sesi (per layanan) lebih dulu, DP dihitung ulang dari (paket+ongkos−diskon)×dp_persen — dan **`status_pengerjaan`** (dropdown: belum mulai/pilih_foto/edit/cetak/pengiriman/selesai), disimpan via server action `updateStatusPengerjaan` (guard admin). **Reschedule** (paket + tanggal + sesi, validasi `getSesiTersedia`). Tombol **Cetak Invoice** + **Kirim Invoice WA** (nomor layanan).
- **Master:** `layanan` (CRUD + admin_wa), `paket` (+ layanan, diskon_returning, dp_persen), **`zona_ongkos`** (nama/keterangan/biaya), `sesi` (nama + jam), `blackout`, `galeri` (upload+kompres), `customer`. Aturan delete sama dgn booking-studio (soft untuk paket/layanan/zona; hard untuk sesi/blackout/galeri; customer tanpa delete).
- **Laporan** + export CSV dipertahankan (filter periode/status; rekap pendapatan & jumlah booking).

---

## 9b. Member (dashboard)

`/member` (login member): riwayat booking milik member + **progress tracker status pengerjaan** tiap booking.
- Tracker = **stepper 5 tahap** (Pilih Foto · Edit · Cetak · Pengiriman · Selesai); tahap saat ini ter-highlight, tahap terlewati ter-ceklis. `status_pengerjaan = NULL` → "Menunggu sesi foto".
- Juga tampilkan: kode, layanan, paket, tanggal/sesi, lokasi sesi (studio/home), data anak, rincian bayar (paket/ongkos/diskon/total/DP/sisa), tombol invoice & Chat Admin WA (nomor layanan).
- Member hanya melihat booking miliknya (RLS + filter `customer_profile_id`). Tema member tetap terang-fungsional.

---

## 10. Invoice PDF (`/invoice/[kode]`)

Route handler GET, render `@react-pdf/renderer`, akses publik-by-kode (kode = token kapabilitas). Dokumen: header **Ruang Baby Happy** + tagline, No. Transaksi, data customer (+ **data anak**), **lokasi sesi (studio / home + alamat)**, layanan + paket + tanggal/sesi (jam mulai–selesai dari durasi), rincian baris **Paket, Home Service (ongkos), Diskon, Total, DP, Sisa**, status, ucapan terima kasih. Format rupiah.

---

## 11. Testing

- **Unit (TDD):** `hitungTagihan` (paket+ongkos−diskon), `hitungDp` (30% atas total termasuk ongkos; studio→ongkos 0), `hitungDiskon` (returning→nilai paket, first-timer→0), ketersediaan sesi (terisi per layanan, blackout, lampau).
- **E2E (desktop + Pixel 5, self-cleaning via REST helper):**
  - **Gate login:** akses form booking tanpa login → diarahkan ke `/login`/`/register`; tak ada jalur tamu.
  - Booking member: login → isi field anak + pilih sesi + upload bukti → konfirmasi muncul; nomor WA = layanan paket.
  - **Home service:** pilih Home Service + zona → rincian total menampilkan baris Home Service & DP 30% atas (paket+ongkos); pilih Di Studio → ongkos 0, tanpa baris Home Service.
  - Member returning: setelah punya 1 transaksi lunas, booking berikutnya menampilkan DP sudah terpotong diskon.
  - Admin Set Lunas → sesi itu (untuk layanan tsb) hilang dari `getSesiTersedia`; sesi sama layanan lain tetap tersedia.
  - **Status pengerjaan:** admin ubah `status_pengerjaan` di detail → member melihat tahap baru di `/member` (stepper).
  - Invoice: `GET /invoice/<kode>` → `content-type: application/pdf`, body non-kosong, memuat data anak & diskon.
  - WA routing: paket newborn → href `wa.me/6285156217634`; cakesmash → `wa.me/6282233684933`.
- **Verifikasi:** `next build` + unit + E2E hijau. Data uji dibuat & dibersihkan via REST.

---

## 12. Langkah Manual

1. Buat **project Supabase baru**, isi `.env.local` (URL, anon key, service-role key).
2. Apply `supabase/migrations/0001_init.sql` (skema + seed layanan/sesi/zona_ongkos) + buat bucket `bukti-tf` (privat) & `galeri` (publik).
3. Isi `src/lib/brand.ts` (brand asli) + unggah foto galeri.
4. Set jam Sesi 1/Sesi 2 final + **zona ongkos & tarif** di master (placeholder).

---

## 13. Keputusan Terkunci

1. **Tanpa loyalitas poin/reward**; sebagai gantinya **diskon pelanggan lama** = nominal per paket (`diskon_returning`), auto untuk member returning + override admin.
2. Jadwal = **2 sesi tetap/hari**, kapasitas **1 per (layanan, sesi, tanggal)** — layanan berbeda boleh berbagi sesi yang sama di hari sama.
3. **2 admin = routing WA saja** (dashboard bersama); nomor WA per layanan di master `layanan`. cakesmash/maternity/sitter → 6282233684933; newborn → 6285156217634.
4. Form menambah **data anak** (nama, BB, jenis kelamin), wajib.
5. **Project & Supabase baru**; fork arsitektur booking-studio (pembayaran upload-bukti v2 dipertahankan).
6. Desain publik **"Baby Happy"** terang-pastel; admin/member tetap terang-fungsional.
7. **Booking wajib registrasi/login — tidak ada visitor/tamu.** Hanya akun member & admin; `booking.guest_*` dihapus, `customer_profile_id` wajib.
8. **Status pengerjaan 5 tahap** (`pilih_foto → edit → cetak → pengiriman → selesai`, NULL=belum mulai) terpisah dari status bayar; diatur admin, ditampilkan ke member sebagai stepper di `/member`.
9. **Home service:** lokasi sesi pilih **Di Studio (ongkos 0) / Home Service**; ongkos via master **`zona_ongkos`** (tarif per zona, admin-overridable) — bukan hitung jarak otomatis/API. Total = paket + ongkos − diskon, ditampilkan sebagai **rincian baris** ke user.
10. **DP = `dp_persen`% per paket (default 30%)** dari total (paket+ongkos−diskon); sisa dibayar hari-H.

---

## 14. Self-Review

- **Placeholder sadar (bukan TBD):** jam sesi (09:00/13:00) & aset brand diisi user saat implementasi — perilaku sistem tidak bergantung pada nilai spesifiknya.
- **Konsistensi:** reuse pola booking-studio v2 (upload bukti, signed URL, RPC lunas, invoice react-pdf, master CRUD, laporan CSV); `payment` to-one dihormati; tidak ada referensi ke tabel/kolom yang dibuang.
- **Ambiguitas teratasi:** kapasitas = per layanan; diskon = kombinasi (eksplisit di §5); WA routing dari master layanan; field anak wajib & tipe jelas.
- **Scope:** satu project kohesif sebesar MVP booking-studio awal; cukup untuk satu siklus rencana implementasi (dapat dipecah jadi beberapa plan: skema+auth, katalog+sesi, booking+bayar, admin+invoice, diskon, desain).
