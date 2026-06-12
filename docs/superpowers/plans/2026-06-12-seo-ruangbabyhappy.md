# SEO Ruang Baby Happy — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membuat ruangbabyhappy bisa di-crawl & diindeks Google dan bersaing di pencarian lokal Sidoarjo — sitemap/robots dinamis, metadata unik per halaman, JSON-LD LocalBusiness + Product/Offer, Open Graph, dan noindex rute privat.

**Architecture:** Lapisan SEO murni di atas halaman yang sudah SSR. Helper & builder pure di `src/lib/seo/*` (diuji vitest), dirender lewat konvensi Next App Router (`sitemap.ts`, `robots.ts`, `generateMetadata`, komponen `<JsonLd>`). Halaman `/paket/[id]` dibuka untuk publik (gating dipindah dari level halaman ke area form booking) agar tiap paket = 1 URL terindeks. `metadataBase`/URL bersumber dari env `NEXT_PUBLIC_SITE_URL` agar migrasi domain = ganti 1 nilai.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Supabase, vitest (unit), sharp (placeholder OG image).

**Spec:** `docs/superpowers/specs/2026-06-12-seo-ruangbabyhappy-design.md`

**Catatan eksekusi (Windows):** cwd shell sering reset ke `d:\brighton-automation-goose`. Jalankan perintah dengan prefix `cd /d/ruangbabyhappy &&`. Semua path file di plan ini relatif ke `d:\ruangbabyhappy`.

---

## Peta file

**Baru:**
- `src/lib/seo/config.ts` — `SITE_URL`, `SITE_NAME`, `absoluteUrl()`, `buildMetadata()`
- `src/lib/seo/jsonld.ts` — `localBusiness()`, `productOffer()`, `breadcrumb()`
- `src/lib/seo/sitemap-data.ts` — `getSitemapData()` + `toSitemapEntries()` (pure)
- `src/components/seo/JsonLd.tsx` — render `<script type="application/ld+json">`
- `src/app/robots.ts` — robots.txt
- `src/app/sitemap.ts` — sitemap.xml
- `src/app/admin/layout.tsx`, `src/app/member/layout.tsx`, `src/app/booking/layout.tsx`, `src/app/login/layout.tsx`, `src/app/register/layout.tsx` — passthrough layout noindex
- `public/og-default.png` — placeholder OG 1200×630
- `tests/unit/seoConfig.test.ts`, `tests/unit/seoJsonld.test.ts`, `tests/unit/seoSitemap.test.ts`

**Diubah:**
- `src/lib/brand.ts` — tambah `alamatLengkap`, `telepon`, `geo`
- `src/app/layout.tsx` — `metadataBase`, default OG/Twitter, JSON-LD LocalBusiness sitewide
- `src/app/page.tsx` — `export const metadata` (home)
- `src/app/paket/[id]/page.tsx` — buka publik + `generateMetadata` + JSON-LD Product/Breadcrumb
- `src/app/v/[slug]/page.tsx` — `generateMetadata`
- `.env.local` — `NEXT_PUBLIC_SITE_URL`

---

## Task 1: Konfigurasi SEO + ekstensi brand + env

**Files:**
- Modify: `src/lib/brand.ts`
- Create: `src/lib/seo/config.ts`
- Create: `tests/unit/seoConfig.test.ts`
- Modify: `.env.local`

- [ ] **Step 1: Tambah field NAP di brand.ts**

Tambahkan 3 field sebelum penutup `} as const;` pada objek `brand` di `src/lib/brand.ts` (sisipkan setelah baris `atasNama: "Ruang Baby Happy",`):

```ts
  // --- Data untuk JSON-LD / SEO lokal ---
  // TODO(user): isi alamat jalan asli (untuk schema PostalAddress)
  alamatLengkap: "Sidoarjo, Jawa Timur",
  // TODO(user): isi nomor WA/telepon bisnis asli, format E.164
  telepon: "+6282233684933",
  // Koordinat studio (sudah real, diambil dari mapsEmbed)
  geo: { lat: -7.368132, lng: 112.75998 },
```

- [ ] **Step 2: Tulis config.ts**

Create `src/lib/seo/config.ts`:

```ts
import type { Metadata } from "next";

/** Base URL situs. Dari env agar migrasi domain = ganti 1 nilai. Tanpa trailing slash. */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://ruangbabyhappy.vercel.app"
).replace(/\/+$/, "");

export const SITE_NAME = "Ruang Baby Happy";
export const DEFAULT_OG = "/og-default.png";

/** Ubah path relatif jadi URL absolut. URL yang sudah absolut dibiarkan. */
export function absoluteUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Helper DRY: bangun Metadata lengkap (title/description/canonical/OG/Twitter). */
export function buildMetadata(opts: {
  title: string;
  description: string;
  path: string;
  image?: string | null;
}): Metadata {
  const url = absoluteUrl(opts.path);
  const image = absoluteUrl(opts.image ?? DEFAULT_OG);
  return {
    title: opts.title,
    description: opts.description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: "id_ID",
      url,
      title: opts.title,
      description: opts.description,
      images: [{ url: image, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: opts.title,
      description: opts.description,
      images: [image],
    },
  };
}
```

- [ ] **Step 3: Tulis test (gagal dulu)**

Create `tests/unit/seoConfig.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { SITE_URL, absoluteUrl, buildMetadata } from "@/lib/seo/config";

describe("seo/config", () => {
  it("absoluteUrl menambah SITE_URL untuk path relatif", () => {
    expect(absoluteUrl("/paket/abc")).toBe(`${SITE_URL}/paket/abc`);
    expect(absoluteUrl("paket/abc")).toBe(`${SITE_URL}/paket/abc`);
  });
  it("absoluteUrl membiarkan URL absolut", () => {
    expect(absoluteUrl("https://x.supabase.co/a.png")).toBe("https://x.supabase.co/a.png");
  });
  it("buildMetadata set canonical + OG + twitter", () => {
    const m = buildMetadata({ title: "T", description: "D", path: "/paket/1" });
    expect(m.alternates?.canonical).toBe(`${SITE_URL}/paket/1`);
    expect(m.openGraph?.title).toBe("T");
    expect((m.openGraph as { url?: string }).url).toBe(`${SITE_URL}/paket/1`);
    expect(m.twitter?.card).toBe("summary_large_image");
    const og = m.openGraph as { images?: { url: string }[] };
    expect(og.images?.[0].url).toBe(`${SITE_URL}/og-default.png`);
  });
  it("buildMetadata pakai image kustom (absolut)", () => {
    const m = buildMetadata({ title: "T", description: "D", path: "/p", image: "https://x.supabase.co/f.png" });
    const og = m.openGraph as { images?: { url: string }[] };
    expect(og.images?.[0].url).toBe("https://x.supabase.co/f.png");
  });
});
```

- [ ] **Step 4: Jalankan test**

Run: `cd /d/ruangbabyhappy && npx vitest run tests/unit/seoConfig.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Tambah env**

Tambah baris ke `.env.local` (setelah baris `NEXT_PUBLIC_ADMIN_WA=...`):

```
NEXT_PUBLIC_SITE_URL=https://ruangbabyhappy.vercel.app
```

- [ ] **Step 6: Commit**

```bash
cd /d/ruangbabyhappy && git add src/lib/brand.ts src/lib/seo/config.ts tests/unit/seoConfig.test.ts .env.local && git commit -m "feat(seo): config SITE_URL + buildMetadata + field NAP brand"
```

---

## Task 2: Builder JSON-LD

**Files:**
- Create: `src/lib/seo/jsonld.ts`
- Create: `tests/unit/seoJsonld.test.ts`

- [ ] **Step 1: Tulis jsonld.ts**

Create `src/lib/seo/jsonld.ts`:

```ts
import { brand } from "@/lib/brand";
import { SITE_URL, SITE_NAME, DEFAULT_OG, absoluteUrl } from "@/lib/seo/config";

/** LocalBusiness sitewide (alamat, telepon, geo dari brand.ts). */
export function localBusiness() {
  return {
    "@context": "https://schema.org",
    "@type": "PhotographyBusiness",
    name: SITE_NAME,
    image: absoluteUrl(DEFAULT_OG),
    url: SITE_URL,
    telephone: brand.telepon,
    address: {
      "@type": "PostalAddress",
      streetAddress: brand.alamatLengkap,
      addressLocality: brand.kota,
      addressRegion: "Jawa Timur",
      addressCountry: "ID",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: brand.geo.lat,
      longitude: brand.geo.lng,
    },
    sameAs: [brand.igUrl],
  };
}

/** Product + Offer untuk satu paket. */
export function productOffer(p: {
  nama: string;
  deskripsi: string | null;
  harga: number;
  image?: string | null;
  layananNama: string;
  path: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${p.nama} — ${p.layananNama}`,
    description: p.deskripsi ?? `${p.nama} di ${SITE_NAME}`,
    image: absoluteUrl(p.image ?? DEFAULT_OG),
    brand: { "@type": "Brand", name: SITE_NAME },
    offers: {
      "@type": "Offer",
      url: absoluteUrl(p.path),
      price: p.harga,
      priceCurrency: "IDR",
      availability: "https://schema.org/InStock",
    },
  };
}

/** BreadcrumbList dari daftar {name, path}. */
export function breadcrumb(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: absoluteUrl(it.path),
    })),
  };
}
```

- [ ] **Step 2: Tulis test (gagal dulu)**

Create `tests/unit/seoJsonld.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { localBusiness, productOffer, breadcrumb } from "@/lib/seo/jsonld";
import { SITE_URL } from "@/lib/seo/config";

describe("seo/jsonld", () => {
  it("localBusiness: tipe + lokalitas + geo", () => {
    const b = localBusiness();
    expect(b["@type"]).toBe("PhotographyBusiness");
    expect(b.address.addressLocality).toBe("Sidoarjo");
    expect(b.address.addressCountry).toBe("ID");
    expect(typeof b.geo.latitude).toBe("number");
    expect(b.sameAs.length).toBeGreaterThan(0);
  });
  it("productOffer: harga IDR + InStock + url absolut", () => {
    const p = productOffer({
      nama: "Paket Gold", deskripsi: "isi", harga: 1650000,
      layananNama: "Newborn", path: "/paket/x", image: null,
    });
    expect(p["@type"]).toBe("Product");
    expect(p.name).toBe("Paket Gold — Newborn");
    expect(p.offers.price).toBe(1650000);
    expect(p.offers.priceCurrency).toBe("IDR");
    expect(p.offers.availability).toBe("https://schema.org/InStock");
    expect(p.offers.url).toBe(`${SITE_URL}/paket/x`);
  });
  it("productOffer: deskripsi null -> fallback", () => {
    const p = productOffer({ nama: "Mini", deskripsi: null, harga: 1, layananNama: "Newborn", path: "/p" });
    expect(p.description).toContain("Mini");
  });
  it("breadcrumb: posisi berurutan", () => {
    const b = breadcrumb([{ name: "Home", path: "/" }, { name: "Newborn", path: "/" }]);
    expect(b.itemListElement[0].position).toBe(1);
    expect(b.itemListElement[1].position).toBe(2);
    expect(b.itemListElement[0].item).toBe(`${SITE_URL}/`);
  });
});
```

- [ ] **Step 3: Jalankan test**

Run: `cd /d/ruangbabyhappy && npx vitest run tests/unit/seoJsonld.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 4: Commit**

```bash
cd /d/ruangbabyhappy && git add src/lib/seo/jsonld.ts tests/unit/seoJsonld.test.ts && git commit -m "feat(seo): builder JSON-LD LocalBusiness + Product/Offer + Breadcrumb"
```

---

## Task 3: Komponen JsonLd

**Files:**
- Create: `src/components/seo/JsonLd.tsx`

- [ ] **Step 1: Tulis komponen**

Create `src/components/seo/JsonLd.tsx`:

```tsx
/** Render satu blok JSON-LD. Dirender server-side (komponen server) -> terbaca crawler. */
export default function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd /d/ruangbabyhappy && git add src/components/seo/JsonLd.tsx && git commit -m "feat(seo): komponen JsonLd"
```

---

## Task 4: robots.ts

**Files:**
- Create: `src/app/robots.ts`

- [ ] **Step 1: Tulis robots.ts**

Create `src/app/robots.ts`:

```ts
import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo/config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/member", "/booking", "/invoice", "/login", "/register", "/logout", "/api"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
```

- [ ] **Step 2: Verifikasi via dev server**

Run: `cd /d/ruangbabyhappy && npm run dev` (jalankan di background), lalu di shell lain:
Run: `cd /d/ruangbabyhappy && curl -s http://localhost:3000/robots.txt`
Expected: berisi `Disallow: /admin` ... dan `Sitemap: https://ruangbabyhappy.vercel.app/sitemap.xml`. Hentikan dev server setelah cek.

- [ ] **Step 3: Commit**

```bash
cd /d/ruangbabyhappy && git add src/app/robots.ts && git commit -m "feat(seo): robots.txt — disallow rute privat + tunjuk sitemap"
```

---

## Task 5: sitemap data + sitemap.ts

**Files:**
- Create: `src/lib/seo/sitemap-data.ts`
- Create: `tests/unit/seoSitemap.test.ts`
- Create: `src/app/sitemap.ts`

- [ ] **Step 1: Tulis sitemap-data.ts (query + transform pure)**

Create `src/lib/seo/sitemap-data.ts`:

```ts
import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/seo/config";

export type PaketSitemap = { id: string; created_at: string };
export type VendorSitemap = { slug: string };

/** Ambil paket aktif + vendor non-default untuk sitemap. */
export async function getSitemapData(): Promise<{ paket: PaketSitemap[]; vendor: VendorSitemap[] }> {
  const supabase = await createClient();
  const { data: paket } = await supabase
    .from("package")
    .select("id, created_at")
    .eq("is_active", true);
  const { data: vendor } = await supabase
    .from("vendor")
    .select("slug")
    .eq("is_active", true)
    .eq("is_default", false);
  return {
    paket: (paket as PaketSitemap[]) ?? [],
    vendor: (vendor as VendorSitemap[]) ?? [],
  };
}

/** Transform pure -> entri sitemap. `now` diinject agar deterministik & bisa diuji. */
export function toSitemapEntries(
  data: { paket: PaketSitemap[]; vendor: VendorSitemap[] },
  now: Date,
): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    ...data.paket.map((p) => ({
      url: `${SITE_URL}/paket/${p.id}`,
      lastModified: new Date(p.created_at),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    ...data.vendor.map((v) => ({
      url: `${SITE_URL}/v/${v.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
```

- [ ] **Step 2: Tulis test (gagal dulu)**

Create `tests/unit/seoSitemap.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { toSitemapEntries } from "@/lib/seo/sitemap-data";
import { SITE_URL } from "@/lib/seo/config";

describe("seo/sitemap toSitemapEntries", () => {
  const now = new Date("2026-06-12T00:00:00Z");
  const data = {
    paket: [{ id: "p1", created_at: "2026-06-01T00:00:00Z" }],
    vendor: [{ slug: "fillens" }],
  };
  it("entri pertama = home priority 1", () => {
    const e = toSitemapEntries(data, now);
    expect(e[0].url).toBe(`${SITE_URL}/`);
    expect(e[0].priority).toBe(1);
  });
  it("paket -> /paket/{id} priority 0.8 + lastmod created_at", () => {
    const e = toSitemapEntries(data, now);
    const p = e.find((x) => x.url === `${SITE_URL}/paket/p1`);
    expect(p?.priority).toBe(0.8);
    expect((p?.lastModified as Date).toISOString()).toBe("2026-06-01T00:00:00.000Z");
  });
  it("vendor non-default -> /v/{slug} priority 0.6", () => {
    const e = toSitemapEntries(data, now);
    const v = e.find((x) => x.url === `${SITE_URL}/v/fillens`);
    expect(v?.priority).toBe(0.6);
  });
  it("total entri = 1 + paket + vendor", () => {
    expect(toSitemapEntries(data, now)).toHaveLength(3);
  });
});
```

- [ ] **Step 3: Jalankan test**

Run: `cd /d/ruangbabyhappy && npx vitest run tests/unit/seoSitemap.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 4: Tulis sitemap.ts**

Create `src/app/sitemap.ts`:

```ts
import type { MetadataRoute } from "next";
import { getSitemapData, toSitemapEntries } from "@/lib/seo/sitemap-data";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const data = await getSitemapData();
  return toSitemapEntries(data, new Date());
}
```

- [ ] **Step 5: Verifikasi via dev server**

Run: `cd /d/ruangbabyhappy && npm run dev` (background), lalu:
Run: `cd /d/ruangbabyhappy && curl -s http://localhost:3000/sitemap.xml`
Expected: XML berisi `<loc>https://ruangbabyhappy.vercel.app/</loc>` dan beberapa `/paket/<uuid>`. Hentikan dev server.

- [ ] **Step 6: Commit**

```bash
cd /d/ruangbabyhappy && git add src/lib/seo/sitemap-data.ts src/app/sitemap.ts tests/unit/seoSitemap.test.ts && git commit -m "feat(seo): sitemap.xml dinamis (home + paket aktif + vendor)"
```

---

## Task 6: Wiring layout.tsx (metadataBase + default OG + LocalBusiness)

**Files:**
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Ganti isi layout.tsx**

Ganti seluruh isi `src/app/layout.tsx` dengan:

```tsx
import type { Metadata } from "next";
import { Baloo_2, Nunito } from "next/font/google";
import "./globals.css";
import { SITE_URL, SITE_NAME, DEFAULT_OG } from "@/lib/seo/config";
import JsonLd from "@/components/seo/JsonLd";
import { localBusiness } from "@/lib/seo/jsonld";

const baloo = Baloo_2({ variable: "--font-baloo", subsets: ["latin"], weight: ["500","600","700","800"] });
const nunito = Nunito({ variable: "--font-nunito", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Ruang Baby Happy — Booking Foto Bayi & Anak Sidoarjo",
  description:
    "Ruang Baby Happy — studio foto bayi & anak (newborn, cakesmash, maternity, sitter) di Sidoarjo. Bisa home service. Booking online.",
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "id_ID",
    url: SITE_URL,
    images: [{ url: DEFAULT_OG, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image", images: [DEFAULT_OG] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" className={`${baloo.variable} ${nunito.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <JsonLd data={localBusiness()} />
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `cd /d/ruangbabyhappy && npx tsc --noEmit`
Expected: tidak ada error pada `src/app/layout.tsx`.

- [ ] **Step 3: Commit**

```bash
cd /d/ruangbabyhappy && git add src/app/layout.tsx && git commit -m "feat(seo): metadataBase + default OG/Twitter + JSON-LD LocalBusiness sitewide"
```

---

## Task 7: Metadata home

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Tambah import + metadata di page.tsx**

Di `src/app/page.tsx`, tambahkan import berikut di blok import atas (setelah baris import `GalleryStrip`):

```tsx
import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo/config";
import { brand } from "@/lib/brand";
```

Catatan: `brand` mungkin sudah di-import di file ini. Jika sudah ada baris `import { brand } from "@/lib/brand";`, JANGAN duplikat — lewati baris itu saja.

Lalu tambahkan, tepat di bawah baris `export const dynamic = "force-dynamic";`:

```tsx
export const metadata: Metadata = buildMetadata({
  title: `Ruang Baby Happy — Foto Newborn, Cakesmash & Maternity ${brand.kota}`,
  description:
    `Studio foto bayi & anak di ${brand.kota}: newborn, cakesmash, maternity, sitter. Bisa home service. Booking online mudah.`,
  path: "/",
});
```

- [ ] **Step 2: Typecheck**

Run: `cd /d/ruangbabyhappy && npx tsc --noEmit`
Expected: tidak ada error pada `src/app/page.tsx` (khususnya tidak ada "Duplicate identifier 'brand'" — jika ada, hapus import brand duplikat).

- [ ] **Step 3: Commit**

```bash
cd /d/ruangbabyhappy && git add src/app/page.tsx && git commit -m "feat(seo): metadata home (title lokal + canonical + OG)"
```

---

## Task 8: Buka /paket/[id] untuk publik + metadata + JSON-LD

**Files:**
- Modify: `src/app/paket/[id]/page.tsx`

Tujuan: pengunjung anonim bisa melihat detail paket (untuk diindeks); form booking di-gate jadi tombol "Masuk untuk booking". Tambah `generateMetadata` + JSON-LD Product/Breadcrumb.

- [ ] **Step 1: Ganti seluruh isi page.tsx**

Ganti seluruh isi `src/app/paket/[id]/page.tsx` dengan:

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PublicShell from "@/components/public/PublicShell";
import { getPackageById, getZonaAktif } from "@/lib/catalog/queries";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAnakByProfile } from "@/lib/member/anak";
import { formatRupiah } from "@/lib/format/rupiah";
import { brand } from "@/lib/brand";
import { buildMetadata } from "@/lib/seo/config";
import { productOffer, breadcrumb } from "@/lib/seo/jsonld";
import JsonLd from "@/components/seo/JsonLd";
import { btnGrad } from "@/components/ui/buttons";
import BookingForm from "./BookingForm";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const paket = await getPackageById(id);
  if (!paket) return { title: "Paket tidak ditemukan — Ruang Baby Happy" };
  const desc = (paket.deskripsi ?? `${paket.nama} di Ruang Baby Happy ${brand.kota}`)
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 155);
  return buildMetadata({
    title: `${paket.nama} — ${paket.layanan_nama} ${formatRupiah(paket.harga)} | Ruang Baby Happy ${brand.kota}`,
    description: desc,
    path: `/paket/${id}`,
    image: paket.foto_url,
  });
}

export default async function PaketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const paket = await getPackageById(id);
  if (!paket) notFound();

  // Detail paket publik (untuk SEO). Data booking hanya diambil bila sudah login.
  const profile = await getCurrentProfile();

  let returning = false;
  let anak: Awaited<ReturnType<typeof getAnakByProfile>> = [];
  let zona: Awaited<ReturnType<typeof getZonaAktif>> = [];
  if (profile) {
    zona = await getZonaAktif();
    const admin = createAdminClient();
    const { count } = await admin
      .from("booking")
      .select("id, payment!inner(status_bayar)", { count: "exact", head: true })
      .eq("customer_profile_id", profile.id)
      .eq("payment.status_bayar", "lunas");
    returning = (count ?? 0) > 0;
    anak = paket.butuh_anak ? await getAnakByProfile(profile.id) : [];
  }

  return (
    <PublicShell>
      <JsonLd
        data={productOffer({
          nama: paket.nama,
          deskripsi: paket.deskripsi,
          harga: paket.harga,
          image: paket.foto_url,
          layananNama: paket.layanan_nama,
          path: `/paket/${id}`,
        })}
      />
      <JsonLd
        data={breadcrumb([
          { name: "Beranda", path: paket.vendor_is_default ? "/" : `/v/${paket.vendor_slug}` },
          { name: paket.layanan_nama, path: paket.vendor_is_default ? "/" : `/v/${paket.vendor_slug}` },
          { name: paket.nama, path: `/paket/${id}` },
        ])}
      />
      <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
        <Link href={paket.vendor_is_default ? "/" : `/v/${paket.vendor_slug}`} className="text-sm text-foreground/50 underline">
          ← Kembali ke {paket.vendor_nama}
        </Link>
        <span className="mt-3 inline-block rounded-full bg-white px-3 py-1 text-xs font-extrabold text-pink-500 shadow-sm">
          {paket.layanan_nama}
        </span>
        <h1 className="mt-2 font-display text-2xl font-extrabold">{paket.nama}</h1>
        {paket.deskripsi && <p className="mt-1 whitespace-pre-line text-foreground/60">{paket.deskripsi}</p>}
        <p className="mt-2 font-display text-2xl font-extrabold text-pink-500">{formatRupiah(paket.harga)}</p>
        <p className="text-xs text-foreground/45">±{paket.durasi_menit} menit · DP {paket.dp_persen}%</p>

        {paket.layanan_bank && (
          <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-3 text-sm text-foreground/70">
            <div className="font-bold">Transfer DP ke:</div>
            <div>{paket.layanan_bank} {paket.layanan_no_rek} a.n. {paket.layanan_atas_nama}</div>
            {paket.layanan_admin_wa && <div className="mt-1 text-xs text-foreground/50">Konfirmasi via WA: {paket.layanan_admin_wa}</div>}
          </div>
        )}

        {profile ? (
          <BookingForm
            packageId={paket.id}
            harga={paket.harga}
            dpPersen={paket.dp_persen}
            diskonReturning={paket.diskon_returning}
            returning={returning}
            zona={zona}
            anak={anak}
            butuhAnak={paket.butuh_anak}
          />
        ) : (
          <div className="mt-5 rounded-2xl border border-pink-200 bg-pink-50 p-4 text-center">
            <p className="text-sm font-semibold text-foreground/70">Mau booking paket ini?</p>
            <Link
              href={`/login?next=${encodeURIComponent(`/paket/${id}`)}`}
              className={`${btnGrad} mt-2 inline-block`}
            >
              Masuk untuk booking
            </Link>
          </div>
        )}
      </main>
    </PublicShell>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `cd /d/ruangbabyhappy && npx tsc --noEmit`
Expected: tidak ada error. (Jika `btnGrad` bukan named export dari `@/components/ui/buttons`, cek file itu — pada home dipakai `import { btnGrad, btnOutline }`, jadi seharusnya ada.)

- [ ] **Step 3: Verifikasi akses publik via dev server**

Run: `cd /d/ruangbabyhappy && npm run dev` (background). Ambil satu id paket aktif dari sitemap (`curl -s http://localhost:3000/sitemap.xml`), lalu:
Run: `cd /d/ruangbabyhappy && curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:3000/paket/<ID_PAKET>"`
Expected: `200` (BUKAN 307/302 redirect ke /login). Lalu cek HTML memuat JSON-LD:
Run: `cd /d/ruangbabyhappy && curl -s "http://localhost:3000/paket/<ID_PAKET>" | grep -c 'application/ld+json'`
Expected: ≥ 3 (LocalBusiness dari layout + Product + Breadcrumb). Hentikan dev server.

- [ ] **Step 4: Commit**

```bash
cd /d/ruangbabyhappy && git add src/app/paket/[id]/page.tsx && git commit -m "feat(seo): buka /paket/[id] utk publik + metadata unik + JSON-LD Product/Breadcrumb"
```

---

## Task 9: Metadata vendor /v/[slug]

**Files:**
- Modify: `src/app/v/[slug]/page.tsx`

- [ ] **Step 1: Tambah import + generateMetadata**

Di `src/app/v/[slug]/page.tsx`, tambahkan import (setelah baris import `formatRupiah`):

```tsx
import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo/config";
import { brand } from "@/lib/brand";
```

Lalu tambahkan, tepat di bawah baris `export const dynamic = "force-dynamic";`:

```tsx
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await getVendorBySlug(slug);
  if (!data) return { title: "Vendor tidak ditemukan — Ruang Baby Happy" };
  const { vendor } = data;
  return buildMetadata({
    title: `${vendor.nama}${vendor.tagline ? ` — ${vendor.tagline}` : ""}`,
    description: vendor.tagline ?? `${vendor.nama} — foto profesional di ${brand.kota}.`,
    path: `/v/${slug}`,
  });
}
```

- [ ] **Step 2: Typecheck**

Run: `cd /d/ruangbabyhappy && npx tsc --noEmit`
Expected: tidak ada error pada file ini.

- [ ] **Step 3: Commit**

```bash
cd /d/ruangbabyhappy && git add src/app/v/[slug]/page.tsx && git commit -m "feat(seo): metadata per-vendor /v/[slug] + canonical"
```

---

## Task 10: noindex rute privat

**Files:**
- Create: `src/app/admin/layout.tsx`
- Create: `src/app/member/layout.tsx`
- Create: `src/app/booking/layout.tsx`
- Create: `src/app/login/layout.tsx`
- Create: `src/app/register/layout.tsx`

Catatan: layout passthrough yang HANYA menetapkan `robots: noindex`. Aman untuk page server maupun client (metadata tidak bisa diekspor dari komponen client, jadi pakai layout). Tidak mengubah tampilan.

- [ ] **Step 1: Buat 5 layout identik**

Isi yang sama untuk kelima file (`src/app/admin/layout.tsx`, `src/app/member/layout.tsx`, `src/app/booking/layout.tsx`, `src/app/login/layout.tsx`, `src/app/register/layout.tsx`):

```tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function NoindexLayout({ children }: { children: React.ReactNode }) {
  return children;
}
```

- [ ] **Step 2: Typecheck + cek tidak ada konflik layout**

Run: `cd /d/ruangbabyhappy && npx tsc --noEmit`
Expected: tidak ada error. (Jika salah satu segmen SUDAH punya `layout.tsx`, JANGAN timpa — sebagai gantinya tambahkan `export const metadata = { robots: { index:false, follow:false } };` ke layout existing itu.)

- [ ] **Step 3: Verifikasi noindex via dev server**

Run: `cd /d/ruangbabyhappy && npm run dev` (background), lalu:
Run: `cd /d/ruangbabyhappy && curl -s http://localhost:3000/login | grep -i noindex`
Expected: muncul `<meta name="robots" content="noindex...`. Hentikan dev server.

- [ ] **Step 4: Commit**

```bash
cd /d/ruangbabyhappy && git add src/app/admin/layout.tsx src/app/member/layout.tsx src/app/booking/layout.tsx src/app/login/layout.tsx src/app/register/layout.tsx && git commit -m "feat(seo): noindex rute privat (admin/member/booking/login/register)"
```

---

## Task 11: OG image placeholder

**Files:**
- Create: `public/og-default.png`

- [ ] **Step 1: Generate placeholder 1200×630 dengan sharp**

Run:

```bash
cd /d/ruangbabyhappy && mkdir -p public && node -e "const s=require('sharp'); s({create:{width:1200,height:630,channels:3,background:{r:251,g:207,b:232}}}).png().toFile('public/og-default.png').then(()=>console.log('og-default.png dibuat')).catch(e=>{console.error(e);process.exit(1)})"
```

Expected: `og-default.png dibuat`.

- [ ] **Step 2: Verifikasi file ada & valid PNG**

Run: `cd /d/ruangbabyhappy && node -e "const s=require('sharp'); s('public/og-default.png').metadata().then(m=>console.log(m.width+'x'+m.height))"`
Expected: `1200x630`.

- [ ] **Step 3: Commit**

```bash
cd /d/ruangbabyhappy && git add public/og-default.png && git commit -m "chore(seo): OG image placeholder 1200x630 (user ganti dgn desain asli)"
```

---

## Task 12: Build penuh, deploy, set env Vercel, verifikasi produksi

**Files:** (tidak ada perubahan kode; build + deploy + verifikasi)

- [ ] **Step 1: Suite unit test penuh**

Run: `cd /d/ruangbabyhappy && npm test`
Expected: semua test PASS (termasuk 3 file seo baru + test lama).

- [ ] **Step 2: Build produksi (typecheck + lint Next)**

Run: `cd /d/ruangbabyhappy && npm run build`
Expected: build sukses tanpa error TypeScript/ESLint. Perhatikan `robots.txt` & `sitemap.xml` muncul di output rute.

- [ ] **Step 3: Set env di Vercel + deploy**

```bash
cd /d/ruangbabyhappy && printf 'https://ruangbabyhappy.vercel.app' | vercel env add NEXT_PUBLIC_SITE_URL production
cd /d/ruangbabyhappy && vercel --prod --yes
```

Expected: env ditambahkan; deploy READY. (Jika `NEXT_PUBLIC_SITE_URL` sudah ada, hapus dulu: `vercel env rm NEXT_PUBLIC_SITE_URL production -y` lalu ulang add.)

- [ ] **Step 4: Verifikasi produksi**

```bash
curl -s https://ruangbabyhappy.vercel.app/robots.txt
curl -s https://ruangbabyhappy.vercel.app/sitemap.xml | head -20
```
Expected: robots berisi Disallow rute privat + baris Sitemap; sitemap berisi `<loc>.../paket/<uuid></loc>`.

Lalu ambil satu id paket dari sitemap dan cek:
```bash
curl -s -o /dev/null -w "%{http_code}\n" "https://ruangbabyhappy.vercel.app/paket/<ID_PAKET>"
curl -s "https://ruangbabyhappy.vercel.app/paket/<ID_PAKET>" | grep -o '<title>[^<]*</title>'
```
Expected: `200`; `<title>` unik berisi nama paket + harga.

- [ ] **Step 5: Validasi rich result (manual, browser)**

Buka https://search.google.com/test/rich-results , tempel URL `https://ruangbabyhappy.vercel.app/paket/<ID_PAKET>`.
Expected: terdeteksi item **Product** (dengan harga) & **Breadcrumb**, tanpa error. Buka juga URL home → terdeteksi **LocalBusiness**. Catat bila ada warning (mis. field opsional kosong).

- [ ] **Step 6 (manual, langkah user — bukan kode):**

Checklist pasca-deploy untuk user (catat di ringkasan, jangan dieksekusi sebagai kode):
- Isi `alamatLengkap` & `telepon` asli di `src/lib/brand.ts`, lalu commit + redeploy.
- Ganti `public/og-default.png` dengan desain OG asli.
- Daftarkan situs di **Google Search Console** + submit `sitemap.xml`.
- Buat/klaim **Google Business Profile** (Maps) dengan NAP konsisten.

---

## Catatan urutan & dependensi

- Task 1 → 2 → 3 berurutan (config dipakai jsonld; JsonLd dipakai layout/pages).
- Task 4 & 5 butuh `SITE_URL` (Task 1).
- Task 6–10 butuh Task 1–3.
- Task 12 paling akhir (build + deploy).
