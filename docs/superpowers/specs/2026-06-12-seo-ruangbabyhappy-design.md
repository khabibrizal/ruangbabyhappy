# Desain SEO — Ruang Baby Happy

**Tanggal:** 2026-06-12
**Status:** Disetujui (siap dibuatkan rencana implementasi)
**Target:** Bersaing di pencarian lokal (Sidoarjo) — fondasi teknis crawl/index + sinyal lokal.
**Pendekatan:** Opsi A — fondasi teknis + sinyal lokal, rendering tetap `force-dynamic`.

## Konteks & masalah saat ini

Situs (`https://ruangbabyhappy.vercel.app`) sudah server-rendered sehingga HTML-nya bisa dibaca Google, dan `<html lang="id">` + title/description dasar sudah ada. Tapi:

- **Tidak ada `sitemap.xml`** → Google tak punya peta URL paket.
- **Tidak ada `robots.txt`** → tidak ada panduan crawl; rute privat (`/admin`, `/member`, `/booking`, `/invoice`) ikut terindeks.
- **Tidak ada metadata per-halaman** → semua halaman paket berbagi title/description generik dari root layout (duplicate title, relevansi lemah).
- **Tidak ada Open Graph / JSON-LD** → tak ada preview kaya saat di-share, tak ada sinyal LocalBusiness/Product.

## Keputusan kunci

- **Domain:** tetap di `ruangbabyhappy.vercel.app` dulu; `metadataBase` dibaca dari env `NEXT_PUBLIC_SITE_URL` agar migrasi domain = ganti 1 nilai.
- **Rendering:** tetap `force-dynamic` (tetap crawlable; tidak mengubah arsitektur). Upgrade ke ISR ditunda sebagai pekerjaan terpisah (Opsi B).
- **Data bisnis tersedia:** alamat studio fisik, nomor WA/telepon, foto real. Jam operasional fleksibel → schema "by appointment" (tanpa `openingHours` kaku).
- **Sumber data SEO:** `brand.ts` (NAP/geo) + Supabase (`layanan`, `package`, `vendor`). Tidak ada subsystem baru.

## Arsitektur & peta file

### File baru
| File | Fungsi |
|---|---|
| `src/app/sitemap.ts` | Sitemap dinamis — query Supabase, daftar URL publik + lastmod |
| `src/app/robots.ts` | robots.txt — allow publik, disallow rute privat, tunjuk ke sitemap |
| `src/lib/seo/config.ts` | Satu sumber: `SITE_URL` (env), nama situs, default OG, helper `buildMetadata()` |
| `src/lib/seo/jsonld.ts` | Builder JSON-LD: `localBusiness()`, `productOffer(paket)`, `breadcrumb()` |
| `src/components/seo/JsonLd.tsx` | Komponen render `<script type="application/ld+json">` |
| `public/og-default.png` | OG image default 1200×630 (placeholder, diganti user) |

### File diubah
| File | Perubahan |
|---|---|
| `src/app/layout.tsx` | `metadataBase`, default OG/Twitter, sisipkan JSON-LD LocalBusiness sitewide |
| `src/app/page.tsx` | `generateMetadata` (home) + canonical |
| `src/app/paket/[id]/page.tsx` | `generateMetadata` per-paket + JSON-LD Product/Offer + breadcrumb |
| `src/app/v/[slug]/page.tsx` | `generateMetadata` per-vendor + canonical |
| Rute privat (`admin`, `member`, `booking`, `invoice`, `login`, `register`) | tambah `robots: { index:false, follow:false }` lewat metadata |
| `src/lib/brand.ts` | tambah field NAP: `alamatLengkap`, `telepon`, `geo {lat,lng}` |
| `.env.local` + Vercel | tambah `NEXT_PUBLIC_SITE_URL=https://ruangbabyhappy.vercel.app` |

## Bagian 1 — Crawl control

### robots.ts
```
User-agent: *
Allow: /
Disallow: /admin
Disallow: /member
Disallow: /booking
Disallow: /invoice
Disallow: /login
Disallow: /register
Disallow: /logout
Disallow: /api
Sitemap: {SITE_URL}/sitemap.xml
```

### sitemap.ts (dinamis, query saat request)
- `/` (home) — priority 1.0, changefreq weekly
- Tiap **paket aktif** (`is_active=true`) → `/paket/{id}`, `lastmod = created_at`, priority 0.8
- Tiap **vendor non-default** (`is_default=false`) → `/v/{slug}`, priority 0.6
- Semua URL absolut dari `SITE_URL`.

### noindex rute privat (dua lapis)
Selain `Disallow` di robots, tiap segmen privat menambahkan `export const metadata = { robots: { index:false, follow:false } }` (atau via layout segmen). `Disallow` mencegah crawl; `noindex` mencegah indexing bila ada link masuk. `/booking/[kode]` & `/invoice/[kode]` berisi data pelanggan → wajib noindex.

## Bagian 2 — Metadata per-halaman

Helper `buildMetadata({ title, description, path, image? })` di `seo/config.ts` menyetel `title`, `description`, `alternates.canonical`, `openGraph`, `twitter` sekaligus (DRY).

- **Home:** title `"Ruang Baby Happy — Foto Newborn, Cakesmash & Maternity Sidoarjo"`; description ringkas + kota; canonical `/`.
- **Paket** (`/paket/[id]`, `generateMetadata`): title `"{Nama Paket} — {Layanan} Rp{harga} | Ruang Baby Happy Sidoarjo"`; description dari `deskripsi` paket (trim ~155 char, newline→spasi); canonical `/paket/{id}`; OG image = `foto_url` paket bila ada, else `og-default.png`. Paket tidak ada → metadata fallback (tidak crash).
- **Vendor** (`/v/[slug]`, `generateMetadata`): title dari `vendor.nama` + tagline; canonical `/v/{slug}`.

Judul unik per paket menghapus masalah duplicate-title saat ini.

## Bagian 3 — Structured data (JSON-LD)

`jsonld.ts` membangun objek; `<JsonLd>` merendernya server-side.

- **LocalBusiness** (sitewide, `layout.tsx`): `@type` `"PhotographyBusiness"`, `name`, `image`, `telephone` (brand), `address` (`PostalAddress`: alamat lengkap + kota Sidoarjo + Jawa Timur), `geo` (lat/lng brand), `url`, `sameAs` (Instagram). Tanpa `openingHours` (by appointment).
- **Product + Offer** (per paket): `name`, `description`, `image`, `offers { price: harga, priceCurrency:"IDR", availability: InStock }`. Memungkinkan rich result harga.
- **BreadcrumbList** (paket): Home › {Layanan} › {Paket}.

## Bagian 4 — OG image, brand/NAP, env

### Ekstensi brand.ts
```ts
export const brand = {
  // ...field existing...
  alamatLengkap: "TODO: Jl. ..., Sidoarjo, Jawa Timur 6xxxx", // PostalAddress (user isi asli)
  telepon: "+62822...",                                        // schema telephone, format E.164 (user isi asli)
  geo: { lat: -7.368132, lng: 112.759980 },                   // sudah real, dari mapsEmbed
}
```
`alamatLengkap` & `telepon` bertanda TODO: JSON-LD tetap valid dengan placeholder, tapi harus diisi asli sebelum berdampak ke ranking lokal. `geo` sudah real.

### OG image
- `public/og-default.png` (1200×630) — placeholder berlogo, diganti user.
- Per-paket: `foto_url` (URL absolut Supabase, sudah di-allow di `next.config` remotePatterns) bila ada.
- Twitter card: `summary_large_image`.

### Env
- `.env.local`: `NEXT_PUBLIC_SITE_URL=https://ruangbabyhappy.vercel.app`
- Vercel: `vercel env add NEXT_PUBLIC_SITE_URL production` + redeploy.
- `seo/config.ts` baca env dengan fallback `https://ruangbabyhappy.vercel.app` agar build lokal jalan.
- Migrasi domain nanti = ganti 1 env ini → sitemap, canonical, OG ikut.

## Verifikasi (manual, pasca-deploy)

Tanpa unit test (metadata statis/SSR). Setelah deploy:
1. `curl /robots.txt` & `/sitemap.xml` → format benar, URL absolut, rute privat ter-disallow.
2. `view-source` halaman paket → `<title>` unik, `<link rel=canonical>`, `<script type=application/ld+json>` ada.
3. **Google Rich Results Test** → validasi LocalBusiness & Product/Offer (tanpa error).
4. Rute privat (`/admin`, `/booking/xxx`) → `<meta name="robots" content="noindex">`.

### Checklist langkah user (pasca-implementasi)
- [ ] Isi `alamatLengkap` & `telepon` asli di `brand.ts`.
- [ ] Ganti `public/og-default.png` dengan desain asli.
- [ ] Daftarkan property di **Google Search Console**, submit `sitemap.xml`.
- [ ] (Lokal) buat/klaim **Google Business Profile** (Maps) dengan NAP konsisten.

## Di luar scope (sengaja ditunda)

- Konversi ke ISR/static (Opsi B) — pekerjaan performa terpisah.
- Skema add-on/T&C paket (Foto Family, DP nominal, dll) — bukan urusan SEO.
- Migrasi ke domain kustom — cukup ganti env saat siap.
