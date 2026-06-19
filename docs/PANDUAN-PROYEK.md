# Panduan Proyek Ruang Baby Happy — Dari Nol sampai Live

Dokumen ini menjelaskan **alur lengkap** aplikasi Ruang Baby Happy: arsitektur,
setup lokal, konfigurasi Supabase, deploy ke Vercel, sampai migrasi domain custom.
Tujuannya supaya kamu paham urutan & bisa mengulang/memelihara sendiri.

Terakhir diperbarui: 2026-06-18.

---

## 1. Ringkasan & Arsitektur

Aplikasi **booking foto bayi & anak** (newborn, cakesmash, maternity, dll) di
Sidoarjo. Member booking online, admin kelola transaksi & master data.

**Stack:**
- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4**
- **Supabase** (Postgres + Auth + Storage) — DB, login, simpan foto
- **@react-pdf/renderer** — invoice & resi pengiriman (PDF)
- **sharp** — kompres foto galeri jadi WebP
- **Vitest** (unit) + **Playwright** (e2e)
- Hosting: **Vercel**. Domain: **www.ruangbabyhappy.web.id** (Domainesia).

**Domain produksi:** `https://www.ruangbabyhappy.web.id`
(apex `ruangbabyhappy.web.id` redirect 308 ke www).

**Struktur folder inti:**
```
src/
  app/                 # rute (App Router)
    (publik)           # beranda, /paket/[id], /v/[slug], /booking, /invoice
    admin/             # dashboard admin: transaksi, master, laporan, schedule, resi
    member/            # area member (riwayat booking)
    login, register, logout
    sitemap.ts, robots.ts
  components/          # UI, seo (JsonLd), public shell
  lib/
    supabase/          # client browser/server/admin (service-role)
    booking/           # query & action transaksi, sesi, WA, resi data
    admin/             # master data (CRUD), customer, transaksi admin
    catalog/           # query katalog publik (paket/vendor/layanan)
    seo/               # config (SITE_URL), jsonld, sitemap-data
    invoice/, resi/    # dokumen PDF
    brand.ts           # NAP brand (nama, alamat, telepon, IG, geo, rekening)
supabase/migrations/   # 0001..0012 skema SQL (dijalankan manual)
scripts/               # skrip util (mis. impor customer legacy)
docs/                  # dokumentasi & spec
```

---

## 2. Prasyarat

- **Node.js 20+** & npm
- **Git**
- Akun **Supabase**, **Vercel**, dan (untuk domain) **Domainesia**
- **Vercel CLI**: `npm i -g vercel`

---

## 3. Setup Lokal

```bash
git clone https://github.com/khabibrizal/ruangbabyhappy.git
cd ruangbabyhappy
npm install
```

Buat file **`.env.local`** (JANGAN di-commit — sudah di-`.gitignore`):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon/publishable key>
SUPABASE_SERVICE_ROLE_KEY=<service role/secret key>   # RAHASIA, server-only
NEXT_PUBLIC_ADMIN_WA=628xxxxxxxxxx                     # no WA admin default
NEXT_PUBLIC_SITE_URL=https://www.ruangbabyhappy.web.id # base URL (canonical/sitemap/OG)
NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=<kode1>,<kode2>   # boleh banyak, dipisah koma
```

Sumber nilai (Supabase dashboard → **Project Settings → API**):
- `NEXT_PUBLIC_SUPABASE_URL` = Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = anon/publishable key
- `SUPABASE_SERVICE_ROLE_KEY` = service_role/secret key (**rahasia**, hanya dipakai server)

Jalankan lokal:
```bash
npm run dev      # http://localhost:3000
npm test         # unit test (vitest)
npm run build    # build produksi (cek error sebelum deploy)
```

---

## 4. Konfigurasi Supabase

### 4.1 Buat project
Buat project baru di [supabase.com](https://supabase.com). Catat **Project URL**,
**anon key**, **service_role key** → isikan ke `.env.local` (lihat §3).

### 4.2 Jalankan migrations (SQL Editor)
Tidak pakai Supabase CLI — migrasi **dijalankan manual** lewat
**Supabase Dashboard → SQL Editor → New query → paste isi file → Run**, **urut**
dari 0001 sampai 0012:

| File | Isi |
|---|---|
| `0001_init.sql` | Skema awal: profiles, layanan, sesi, blackout_date, package, booking, payment, zona_ongkos |
| `0002_rls.sql` | Fungsi `is_admin()`, trigger `handle_new_user` (auto-buat profil saat signup), aktifkan RLS + policy |
| `0003_rpc.sql` | RPC `set_payment_lunas` (SECURITY DEFINER) |
| `0004_gallery.sql` | Tabel `gallery` (foto galeri publik) |
| `0005_booking_item.sql` | Tabel `booking_item` (multi-item per transaksi) |
| `0006_drive_rekening.sql` | `booking.drive_url` + rekening per layanan (bank/no_rek/atas_nama) |
| `0007_vendor.sql` | Multi-vendor (brand identitas) + relasi layanan→vendor |
| `0008_sesi_lokasi.sql` | (deprecated) kolom lokasi di sesi — **keliru**, digantikan 0009 |
| `0009_paket_lokasi.sql` | Kapabilitas lokasi **per paket** (`bisa_studio`/`bisa_home`) |
| `0010_drop_sesi_lokasi.sql` | Cleanup: hapus kolom lokasi sesi dari 0008 (jalankan setelah deploy 0009) |
| `0011_customer_legacy_ig.sql` | Longgarkan FK profiles→auth (customer tanpa login) + kolom `ig` |
| `0012_booking_customer_idx.sql` | Indeks `booking(customer_profile_id)` utk riwayat transaksi |

> **Penting:** kode aplikasi yang mengakses kolom baru harus di-deploy **setelah**
> migrasi terkait dijalankan, kalau tidak query-nya error 400 (kolom belum ada).

### 4.3 Storage buckets
Buat 2 bucket di **Supabase → Storage**:
- **`galeri`** — **Public** (foto galeri tampil di situs; dikompres ke WebP via sharp).
- **`bukti-tf`** — **Private** (bukti transfer; diakses via signed URL berdurasi 1 jam).

### 4.4 Auth settings
- **Email signup** aktif.
- Registrasi memakai **admin API `createUser({ email_confirm: true })`** lalu langsung
  `signInWithPassword` (lihat `src/app/register/actions.ts`) — supaya user **bisa
  langsung login setelah daftar** tanpa bergantung setting "Confirm email" dashboard.

### 4.5 Membuat admin pertama
Tidak ada UI untuk mengangkat admin. Daftar akun biasa lewat `/register`, lalu di
**SQL Editor**:
```sql
update public.profiles set role = 'admin' where email = 'emailkamu@contoh.com';
```
Login ulang → akses `/admin`.

---

## 5. Deploy ke Vercel

### 5.1 Hubungkan project
```bash
vercel login
vercel link           # pilih scope "happyphotostudio-s-projects", project "ruangbabyhappy"
```

### 5.2 Set environment variables (Production)
Set semua env (kecuali yang khusus lokal) di Vercel:
```bash
# contoh; ulangi utk tiap variabel
printf "https://www.ruangbabyhappy.web.id" | vercel env add NEXT_PUBLIC_SITE_URL production
```
Variabel produksi yang harus ada: `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_ADMIN_WA`,
`NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`.
Cek: `vercel env ls production`. Ganti nilai: `vercel env rm <NAMA> production -y` lalu `add` lagi.

### 5.3 Deploy
```bash
vercel --prod --yes        # deploy produksi dari lokal
```
> Catatan: proyek ini di-deploy **CLI dari lokal**. Commit ke GitHub tetap dilakukan
> untuk versioning, tapi deploy tidak otomatis dari git (kecuali Git Integration diaktifkan).

### 5.4 Konvensi commit & push
```bash
git add -A
git commit -m "..."        # akhiri dgn baris Co-Authored-By bila perlu
git push origin master
```
**Jangan pernah commit `.env.local` atau file data pribadi** (CSV customer) — sudah
di-`.gitignore` (`scripts/*.csv`).

---

## 6. Operasi Rutin

### 6.1 Menambah migrasi baru
Buat file `supabase/migrations/00NN_nama.sql`, lalu **jalankan SQL-nya di Supabase
SQL Editor**. Deploy kode yang memakainya **setelah** migrasi dijalankan.

### 6.2 Impor data customer (legacy)
Lihat `scripts/import-legacy-customers.mjs`:
```bash
node scripts/import-legacy-customers.mjs "scripts/data.csv" --dry   # pratinjau
node scripts/import-legacy-customers.mjs "scripts/data.csv"          # impor
```
Membersihkan no telp/IG/email, dedup per no telp, skip yang sudah ada. CSV **tidak
di-commit** (privasi).

---

## 7. Migrasi / Setup Domain Custom (alur lengkap)

Riwayat: dari `ruangbabyhappy.vercel.app` → **`www.ruangbabyhappy.web.id`** (Domainesia).

### Tahap A — Daftarkan domain ke Vercel
```bash
vercel domains add ruangbabyhappy.web.id
vercel domains add www.ruangbabyhappy.web.id
```
(Domain otomatis ter-assign ke project yang ter-link.)

### Tahap B — Setel DNS di Domainesia
**Client Area → Domain → Kelola DNS / DNS Management.** Pakai record **baru** yang
disarankan Vercel (range IP baru — yang lama 76.76.21.21/cname.vercel-dns.com masih
jalan tapi bikin cert apex lambat):

| Type | Host | Value |
|---|---|---|
| **A** | `@` | `216.198.79.1` |
| **CNAME** | `www` | `42d191ddaf363dfd.vercel-dns-017.com` *(unik per project — salin dari Vercel → Settings → Domains → Learn more)* |

- Hapus record A/CNAME parkir bawaan untuk `@`/`www`. Jangan sentuh NS & MX.
- Nameserver tetap `nsx1/nsx2.domainesia.com` (DNS dikelola di Domainesia, **tidak**
  perlu pindah nameserver ke Vercel).

### Tahap C — Verifikasi & SSL
DNS propagasi beberapa menit → Vercel auto-verifikasi + terbitkan SSL (Let's Encrypt).
Cek: `https://www.ruangbabyhappy.web.id` dan `https://ruangbabyhappy.web.id` keduanya
HTTPS 200/redirect. Badge "DNS Change Recommended" hilang setelah pakai record baru.

### Tahap D — Ganti base URL
1. `src/lib/seo/config.ts` → default `SITE_URL` = domain baru.
2. `.env.local` → `NEXT_PUBLIC_SITE_URL=https://www.ruangbabyhappy.web.id`.
3. Vercel: `vercel env rm NEXT_PUBLIC_SITE_URL production -y` lalu `add` nilai baru.
4. `vercel --prod`. → canonical, og:url, sitemap, robots, JSON-LD otomatis ikut
   (semua baca `SITE_URL`).

### Tahap E — Primary + redirect
Di **Vercel → Settings → Domains**: jadikan `www` primary, set apex
`ruangbabyhappy.web.id` **Redirect to → www** (308).

### Tahap F — Google
- **Search Console:** Add property **URL prefix** `https://www.ruangbabyhappy.web.id`
  → verifikasi **HTML tag**. Jika kode berbeda dari property lama, masukkan **kedua**
  kode ke `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` (dipisah koma) — layout merender
  semua. Lalu **Sitemaps** → submit `sitemap.xml`. (Status "Tidak dapat mengambil"
  tepat setelah submit itu wajar, berubah "Berhasil" dalam beberapa jam.)
- **Google Business Profile:** ganti Website → `https://www.ruangbabyhappy.web.id`.

---

## 8. Fitur Admin (ringkas)

- **Transaksi** (`/admin/transaksi`): daftar + filter (status bayar/pengerjaan/tanggal),
  detail per transaksi (pembayaran, status pengerjaan, reschedule, tambah/hapus item,
  kirim WA, cetak invoice). **Cetak Resi**: centang transaksi status Pengiriman/Selesai
  → tombol "Cetak Resi" → PDF (5 client/lembar A4).
- **Master** (`/admin/master`): Customer (cari + riwayat + edit), Vendor, Layanan,
  Paket (termasuk kapabilitas lokasi studio/home), Sesi, Zona Ongkos, Blackout, Galeri.
- **Laporan** (`/admin/laporan`) & **Schedule** (`/admin/schedule`).
- Feedback aksi admin lewat **toast global** (`?ok`/`?error` → `FlashToast`).

---

## 8b. Akun & Password

- **Daftar** (`/register`): pakai admin `createUser({ email_confirm: true })` + auto
  `signInWithPassword` → user langsung login (tak bergantung setting "Confirm email").
- **Ganti Password** (`/member/ganti-password`): verifikasi password lama →
  `updateUser`. Tanpa email.
- **Lupa Password** (`/lupa-password` → `/reset-password`): metode **KODE 6-digit**
  (bukan magic-link). `resetPasswordForEmail` → user ketik kode dari email →
  `verifyOtp({ type: "recovery" })` → `updateUser`. Link "Lupa password?" di `/login`.
  - **Butuh di Supabase**: SMTP aktif + **template "Reset Password" memuat
    `{{ .Token }}`** (lihat §4). Tanpa itu kode tak terkirim.
- **Reset Password oleh Admin** (cadangan): di Master Customer detail →
  `updateUserById`. Tanpa email; customer legacy tanpa akun login tak bisa.
- 📘 Panduan lengkap + kode copy-paste untuk pasang fitur ini di project lain:
  [`docs/FITUR-PASSWORD-REUSABLE.md`](FITUR-PASSWORD-REUSABLE.md).

---

## 9. Troubleshooting

| Gejala | Sebab & solusi |
|---|---|
| Daftar lalu login gagal "Email not confirmed" | Setting "Confirm email" aktif. Sudah diatasi: register pakai admin `createUser(email_confirm:true)` + auto sesi. |
| Cert apex (non-www) tak kunjung terbit | DNS masih pakai record lama. Ganti ke record baru Vercel (A `216.198.79.1`, CNAME `…vercel-dns-017.com`). |
| Query error 400 "column … does not exist" | Migrasi terkait belum dijalankan di Supabase sebelum deploy. Jalankan SQL-nya. |
| Sitemap "Tidak dapat mengambil" di GSC | Umumnya transient setelah submit; cek `sitemap.xml` HTTP 200 application/xml, tunggu beberapa jam. |
| Domain custom tak terlihat di Vercel | Salah scope. Pilih team `happyphotostudio-s-projects`, bukan akun personal. |
| Upload galeri "Unexpected end of form" | Body limit. Sudah dinaikkan di `next.config.ts` (`serverActions.bodySizeLimit` & `proxyClientMaxBodySize` 25mb). |
| Reset password: email masih berformat link | Template "Reset Password" belum diubah ke `{{ .Token }}`/belum Save, atau membuka email lama (Gmail menggabungkan subjek sama). |
| Reset password: `otp_expired` terus | Email rate-limited (klik email lama) atau pemindai email mengonsumsi link. Pakai metode KODE + SMTP sendiri. |
| Setting Supabase "tidak ngefek" | Salah project. Pastikan project ref dashboard = `NEXT_PUBLIC_SUPABASE_URL` (`tcvsgmtvtveaqjmehqpu`), bukan project lain. |

---

## 10. Keamanan

- `SUPABASE_SERVICE_ROLE_KEY` **bypass RLS** — hanya dipakai di kode server
  (`src/lib/supabase/admin.ts`), JANGAN di klien, JANGAN di-commit.
- `.env.local` & `scripts/*.csv` (data pribadi) di-`.gitignore`. Kalau sensitif
  ter-commit, hapus dari history (`git rm --cached` + `git commit --amend`/`filter-branch`)
  lalu force-push, dan pertimbangkan rotate key bila sempat ter-push publik.
- RLS aktif: member hanya akses datanya sendiri; admin akses semua via `is_admin()`.
- Rute privat (admin/member/booking/login/register) di-`noindex`.
```
