# Ruang Baby Happy — Plan 1: Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Berdiri-kan project Next.js + Supabase "Ruang Baby Happy" yang jalan — dengan skema DB lengkap (per spec), RLS, auth member-only (registrasi/login/logout), proxy gate `/member` & `/admin`, tema dasar "Baby Happy", dan landing shell.

**Architecture:** Fork pola arsitektur booking-studio (App Router, Server Actions + service-role untuk operasi sensitif, Supabase SSR untuk auth/RLS). Plan ini hanya membangun fondasi: konfigurasi, klien Supabase, migrasi SQL (skema+RLS+RPC), dan auth. Katalog/booking/admin menyusul di Plan 2–4; desain penuh di Plan 5.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind v4, @supabase/ssr + @supabase/supabase-js, Vitest (unit), Playwright (E2E desktop+mobile), @react-pdf/renderer & sharp (di-install sekarang untuk dipakai plan berikutnya).

**Prasyarat manual (dilakukan user sekali):** membuat **project Supabase baru**, lalu mengisi `.env.local` (Task 11). Apply migrasi SQL (Task 12) lewat Supabase SQL Editor.

---

## File Structure (dibuat di plan ini)

```
d:\ruangbabyhappy\
  package.json, tsconfig.json, next.config.ts, postcss.config.mjs,
  eslint.config.mjs, vitest.config.ts, playwright.config.ts,
  .gitignore, .env.example
  supabase/migrations/0001_init.sql        # skema tabel + seed
  supabase/migrations/0002_rls.sql         # is_admin, trigger profile, RLS policies
  supabase/migrations/0003_rpc.sql         # set_payment_lunas (tanpa poin)
  src/
    proxy.ts                               # gate /member & /admin
    lib/
      supabase/{client,server,admin}.ts
      auth/getCurrentProfile.ts
      brand.ts
      format/rupiah.ts
    components/
      ui/buttons.ts
      public/{PublicShell,Navbar,Footer}.tsx
    app/
      globals.css, layout.tsx, page.tsx     # tema baby + landing shell
      login/{page.tsx,actions.ts}
      register/{page.tsx,actions.ts}
      logout/route.ts
      member/page.tsx                        # placeholder (diisi Plan 4)
      admin/page.tsx                          # placeholder (diisi Plan 2/4)
  tests/
    unit/rupiah.test.ts
    e2e/smoke.spec.ts
```

---

## Task 1: Inisialisasi project + file konfigurasi

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `vitest.config.ts`, `playwright.config.ts`, `.gitignore`, `.env.example`

- [ ] **Step 1: Buat `package.json`**

```json
{
  "name": "ruangbabyhappy",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test"
  },
  "dependencies": {
    "@react-pdf/renderer": "^4.5.1",
    "@supabase/ssr": "^0.12.0",
    "@supabase/supabase-js": "^2.108.0",
    "next": "16.2.7",
    "react": "19.2.4",
    "react-dom": "19.2.4",
    "sharp": "^0.34.5"
  },
  "devDependencies": {
    "@playwright/test": "^1.60.0",
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "@vitest/coverage-v8": "^4.1.8",
    "eslint": "^9",
    "eslint-config-next": "16.2.7",
    "tailwindcss": "^4",
    "typescript": "^5",
    "vitest": "^4.1.8"
  }
}
```

- [ ] **Step 2: Buat `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Buat `next.config.ts`**

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: { remotePatterns: [{ protocol: "https", hostname: "*.supabase.co" }] },
  // Naikkan limit body Server Action agar upload foto (bukti/galeri) muat.
  experimental: { serverActions: { bodySizeLimit: "10mb" } },
};

export default nextConfig;
```

- [ ] **Step 4: Buat `postcss.config.mjs`**

```js
const config = { plugins: { "@tailwindcss/postcss": {} } };
export default config;
```

- [ ] **Step 5: Buat `eslint.config.mjs`**

```js
import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [...compat.extends("next/core-web-vitals", "next/typescript")];
export default eslintConfig;
```

- [ ] **Step 6: Buat `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { include: ["tests/unit/**/*.test.ts"], environment: "node" },
  resolve: { alias: { "@": new URL("./src", import.meta.url).pathname } },
});
```

- [ ] **Step 7: Buat `playwright.config.ts`**

```ts
import { defineConfig, devices } from "@playwright/test";
import fs from "node:fs";

// Muat .env.local ke process.env agar test dapat akses Supabase REST bila perlu.
try {
  for (const line of fs.readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
} catch {
  // .env.local tidak ada (mis. CI) — abaikan.
}

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  workers: process.env.CI ? 1 : 2,
  use: { baseURL: "http://localhost:3000" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 5"] } },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
```

- [ ] **Step 8: Buat `.gitignore`**

```
node_modules
.next
.env.local
.env*.local
/test-results
/playwright-report
/coverage
*.tsbuildinfo
next-env.d.ts
```

- [ ] **Step 9: Buat `.env.example`**

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_ADMIN_WA=628xxxxxxxxxx
```

- [ ] **Step 10: Install dependencies**

Run: `cd /d/ruangbabyhappy && npm install`
Expected: `node_modules` terbuat, tanpa error fatal (peer-warning boleh).

- [ ] **Step 11: Install browser Playwright**

Run: `npx playwright install chromium`
Expected: unduh selesai.

- [ ] **Step 12: Commit**

```bash
git add package.json tsconfig.json next.config.ts postcss.config.mjs eslint.config.mjs vitest.config.ts playwright.config.ts .gitignore .env.example
git commit -m "chore: scaffold project + konfigurasi (Next 16 + Supabase + Tailwind v4)"
```

---

## Task 2: Klien Supabase

**Files:**
- Create: `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`, `src/lib/supabase/admin.ts`

- [ ] **Step 1: `src/lib/supabase/client.ts`** (browser client)

```ts
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

- [ ] **Step 2: `src/lib/supabase/server.ts`** (server client, baca cookie)

```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // dipanggil dari Server Component — diabaikan, proxy yang refresh.
          }
        },
      },
    },
  );
}
```

- [ ] **Step 3: `src/lib/supabase/admin.ts`** (service-role, server-only)

```ts
import { createClient } from "@supabase/supabase-js";

/** HANYA dipakai di server (Server Actions / route handlers). Jangan import di komponen client. */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/supabase
git commit -m "feat: klien Supabase (browser, server SSR, service-role admin)"
```

---

## Task 3: Skema database — `0001_init.sql`

**Files:**
- Create: `supabase/migrations/0001_init.sql`

- [ ] **Step 1: Tulis migrasi skema lengkap** (sesuai spec §3; tanpa visitor, tanpa poin/reward/resource)

```sql
-- ============ Ruang Baby Happy — skema awal ============

-- Profiles: 1:1 dengan auth.users (hanya member & admin; tidak ada visitor)
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('member','admin')),
  nama text,
  no_wa text,
  alamat text,
  email text,
  created_at timestamptz not null default now()
);

-- Layanan (cakesmash/maternity/sitter/newborn) — tiap layanan punya nomor WA admin
create table public.layanan (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  admin_wa text not null,
  urutan smallint not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Sesi tetap per hari (Sesi 1, Sesi 2). Kapasitas 1 per (layanan, sesi, tanggal).
create table public.sesi (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  jam_mulai time not null,
  urutan smallint not null default 0,
  is_active boolean not null default true
);

-- Tanggal tutup/libur
create table public.blackout_date (
  id uuid primary key default gen_random_uuid(),
  tanggal date not null unique,
  keterangan text
);

-- Paket foto (terkait layanan; punya diskon returning & persen DP)
create table public.package (
  id uuid primary key default gen_random_uuid(),
  layanan_id uuid not null references public.layanan (id),
  nama text not null,
  deskripsi text,
  harga integer not null,
  diskon_returning integer not null default 0,
  dp_persen integer not null default 30,
  durasi_menit integer not null,
  foto_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Zona ongkos home service (tarif per zona)
create table public.zona_ongkos (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  keterangan text,
  biaya integer not null,
  urutan smallint not null default 0,
  is_active boolean not null default true
);

-- Booking (wajib milik member; sesi + data anak + lokasi)
create table public.booking (
  id uuid primary key default gen_random_uuid(),
  kode_booking text not null unique,
  package_id uuid not null references public.package (id),
  sesi_id uuid not null references public.sesi (id),
  customer_profile_id uuid not null references public.profiles (id),
  anak_nama text not null,
  anak_bb numeric(4,1) not null,
  anak_jk text not null check (anak_jk in ('L','P')),
  lokasi_sesi text not null default 'home' check (lokasi_sesi in ('studio','home')),
  zona_id uuid references public.zona_ongkos (id),
  alamat_sesi text,
  tanggal date not null,
  jam_mulai time not null,
  status_booking text not null default 'pending'
    check (status_booking in ('pending','confirmed','completed','cancelled')),
  status_pengerjaan text
    check (status_pengerjaan in ('pilih_foto','edit','cetak','pengiriman','selesai')),
  catatan text,
  created_at timestamptz not null default now()
);

-- Pembayaran (1 booking : 1 tagihan)
create table public.payment (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.booking (id) on delete cascade,
  total integer not null,
  ongkos integer not null default 0,
  diskon integer not null default 0,
  dp_amount integer,
  status_bayar text not null default 'unpaid'
    check (status_bayar in ('unpaid','dp_paid','lunas')),
  metode text default 'transfer',
  dibayar_at timestamptz,
  dicatat_oleh uuid references public.profiles (id),
  bukti_url text,
  catatan_admin text
);

create index on public.booking (tanggal);
create index on public.booking (sesi_id);
create index on public.package (layanan_id);
create index on public.payment (status_bayar);

-- ============ Seed awal (placeholder; jam sesi & tarif zona diatur ulang admin) ============
insert into public.layanan (nama, admin_wa, urutan) values
  ('Cakesmash', '6282233684933', 1),
  ('Maternity', '6282233684933', 2),
  ('Sitter',    '6282233684933', 3),
  ('Newborn',   '6285156217634', 4);

insert into public.sesi (nama, jam_mulai, urutan) values
  ('Sesi 1', '09:00', 1),
  ('Sesi 2', '13:00', 2);

insert into public.zona_ongkos (nama, keterangan, biaya, urutan) values
  ('Zona 1', '≤5 km',   50000,  1),
  ('Zona 2', '5–10 km', 100000, 2),
  ('Zona 3', '10–20 km',150000, 3);
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/0001_init.sql
git commit -m "feat(db): skema awal 0001 (layanan/sesi/zona/paket/booking/payment) + seed"
```

---

## Task 4: RLS + RPC — `0002_rls.sql` & `0003_rpc.sql`

**Files:**
- Create: `supabase/migrations/0002_rls.sql`, `supabase/migrations/0003_rpc.sql`

- [ ] **Step 1: `supabase/migrations/0002_rls.sql`**

```sql
-- Helper: cek apakah user aktif admin
create or replace function public.is_admin()
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

-- Auto-buat profile saat user baru daftar
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'member')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Aktifkan RLS
alter table public.profiles     enable row level security;
alter table public.layanan      enable row level security;
alter table public.sesi         enable row level security;
alter table public.blackout_date enable row level security;
alter table public.package      enable row level security;
alter table public.zona_ongkos  enable row level security;
alter table public.booking      enable row level security;
alter table public.payment      enable row level security;

-- profiles: user lihat/ubah miliknya; admin semua
create policy profiles_self_select on public.profiles
  for select using (id = auth.uid() or public.is_admin());
create policy profiles_self_update on public.profiles
  for update using (id = auth.uid() or public.is_admin());

-- Master publik boleh dibaca semua; tulis hanya admin
create policy layanan_read on public.layanan for select using (true);
create policy layanan_write on public.layanan for all
  using (public.is_admin()) with check (public.is_admin());

create policy sesi_read on public.sesi for select using (true);
create policy sesi_write on public.sesi for all
  using (public.is_admin()) with check (public.is_admin());

create policy bo_read on public.blackout_date for select using (true);
create policy bo_write on public.blackout_date for all
  using (public.is_admin()) with check (public.is_admin());

create policy package_read on public.package for select using (true);
create policy package_write on public.package for all
  using (public.is_admin()) with check (public.is_admin());

create policy zona_read on public.zona_ongkos for select using (true);
create policy zona_write on public.zona_ongkos for all
  using (public.is_admin()) with check (public.is_admin());

-- booking: member lihat miliknya; admin semua. (INSERT lewat server service-role.)
create policy booking_owner_select on public.booking
  for select using (customer_profile_id = auth.uid() or public.is_admin());

-- payment: pemilik booking atau admin
create policy payment_select on public.payment
  for select using (
    public.is_admin() or exists (
      select 1 from public.booking b
      where b.id = payment.booking_id and b.customer_profile_id = auth.uid()
    )
  );
```

- [ ] **Step 2: `supabase/migrations/0003_rpc.sql`** (set lunas — tanpa poin)

```sql
-- Set pembayaran -> lunas + booking -> completed. (Tanpa poin; loyalitas tidak dipakai.)
-- SECURITY DEFINER: dipanggil server (service-role) maupun admin terautentikasi.
create or replace function public.set_payment_lunas(p_payment_id uuid, p_admin uuid)
returns void language plpgsql security definer as $$
declare
  v_booking_id uuid;
begin
  select booking_id into v_booking_id
  from public.payment where id = p_payment_id for update;
  if v_booking_id is null then
    raise exception 'payment % tidak ditemukan', p_payment_id;
  end if;

  update public.payment
    set status_bayar = 'lunas', dibayar_at = now(), dicatat_oleh = p_admin
    where id = p_payment_id;
  update public.booking set status_booking = 'completed' where id = v_booking_id;
end;
$$;
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0002_rls.sql supabase/migrations/0003_rpc.sql
git commit -m "feat(db): RLS policies + trigger profile + RPC set_payment_lunas (tanpa poin)"
```

---

## Task 5: Brand, format rupiah, tema dasar & layout

**Files:**
- Create: `src/lib/brand.ts`, `src/lib/format/rupiah.ts`, `src/app/globals.css`, `src/app/layout.tsx`
- Test: `tests/unit/rupiah.test.ts`

- [ ] **Step 1: Tulis test gagal `tests/unit/rupiah.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { formatRupiah } from "@/lib/format/rupiah";

describe("formatRupiah", () => {
  it("format ribuan Indonesia", () => {
    expect(formatRupiah(150000)).toBe("Rp150.000");
    expect(formatRupiah(1050000)).toBe("Rp1.050.000");
    expect(formatRupiah(0)).toBe("Rp0");
  });
  it("null/undefined -> '-'", () => {
    expect(formatRupiah(null)).toBe("-");
    expect(formatRupiah(undefined)).toBe("-");
  });
});
```

- [ ] **Step 2: Jalankan test, pastikan GAGAL**

Run: `npm run test -- rupiah`
Expected: FAIL — `Cannot find module '@/lib/format/rupiah'`.

- [ ] **Step 3: `src/lib/format/rupiah.ts`**

```ts
/** Format angka rupiah: 150000 -> "Rp150.000". null/undefined -> "-". */
export function formatRupiah(nilai: number | null | undefined): string {
  if (nilai === null || nilai === undefined) return "-";
  return "Rp" + nilai.toLocaleString("id-ID");
}
```

- [ ] **Step 4: Jalankan test, pastikan LULUS**

Run: `npm run test -- rupiah`
Expected: PASS (5 assertion).

- [ ] **Step 5: `src/lib/brand.ts`** (placeholder Baby Happy — user isi nilai final)

```ts
export const brand = {
  nama: "Ruang Baby Happy",
  wordmark: "Ruang Baby Happy",
  tagline: "imagine your little moment",
  ig: "ruangbabyhappy",
  igUrl: "https://instagram.com/ruangbabyhappy",
  // TODO(user): ganti alamat & koordinat asli saat implementasi
  alamat: "Sidoarjo",
  kota: "Sidoarjo",
  mapsEmbed: "https://maps.google.com/maps?q=-7.4478,112.7183&z=15&output=embed",
  mapsDir: "https://www.google.com/maps/dir/?api=1&destination=-7.4478,112.7183",
} as const;

// Foto galeri diisi via master Galeri (Plan 4/5) / folder public; kosong di awal.
export const galleryImages: string[] = [];
```

- [ ] **Step 6: `src/app/globals.css`** (tema "Baby Happy" terang-pastel)

```css
@import "tailwindcss";

:root {
  --background: #fff8f3;
  --foreground: #4a3b47;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-nunito);
  --font-display: var(--font-baloo);
}

body {
  background: #f3e9f2;
  color: var(--foreground);
  font-family: var(--font-nunito), system-ui, Arial, sans-serif;
}

/* === Utilities tema "Baby Happy" === */
.bg-grad {
  background-image: linear-gradient(135deg, #f9a8d4 0%, #fda4af 45%, #fdba74 100%);
}
.text-grad {
  background-image: linear-gradient(135deg, #ec4899, #fb7185, #fb923c);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.grad-soft {
  background-image: linear-gradient(160deg, #ffe4ef 0%, #fff1e6 55%, #e9fbf1 100%);
}
.font-display {
  font-family: var(--font-baloo), cursive;
}
```

- [ ] **Step 7: `src/app/layout.tsx`** (font Baloo 2 + Nunito, metadata)

```tsx
import type { Metadata } from "next";
import { Baloo_2, Nunito } from "next/font/google";
import "./globals.css";

const baloo = Baloo_2({ variable: "--font-baloo", subsets: ["latin"], weight: ["500","600","700","800"] });
const nunito = Nunito({ variable: "--font-nunito", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Ruang Baby Happy — Booking Foto Bayi & Anak Sidoarjo",
  description:
    "Ruang Baby Happy — studio foto bayi & anak (newborn, cakesmash, maternity, sitter) di Sidoarjo. Bisa home service. Booking online.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" className={`${baloo.variable} ${nunito.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
```

- [ ] **Step 8: Commit**

```bash
git add src/lib/brand.ts src/lib/format/rupiah.ts src/app/globals.css src/app/layout.tsx tests/unit/rupiah.test.ts
git commit -m "feat: brand Baby Happy, formatRupiah (TDD), tema dasar + layout (Baloo 2/Nunito)"
```

---

## Task 6: Komponen UI dasar + landing shell

**Files:**
- Create: `src/components/ui/buttons.ts`, `src/components/public/PublicShell.tsx`, `src/components/public/Navbar.tsx`, `src/components/public/Footer.tsx`, `src/app/page.tsx`

- [ ] **Step 1: `src/components/ui/buttons.ts`** (kelas tombol pill DRY)

```ts
export const btnGrad =
  "inline-flex h-11 items-center justify-center rounded-full bg-grad px-6 font-bold text-white shadow-lg transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40";
export const btnOutline =
  "inline-flex h-11 items-center justify-center rounded-full bg-white px-6 font-bold text-pink-500 ring-1 ring-pink-200 transition hover:bg-pink-50";
export const btnGradSm =
  "inline-flex h-9 items-center justify-center rounded-full bg-grad px-4 text-sm font-bold text-white transition hover:opacity-90";
export const btnOutlineSm =
  "inline-flex h-9 items-center justify-center rounded-full bg-white px-4 text-sm font-bold text-pink-500 ring-1 ring-pink-200 transition hover:bg-pink-50";
```

- [ ] **Step 2: `src/components/public/Navbar.tsx`**

```tsx
import Link from "next/link";
import { brand } from "@/lib/brand";
import { btnGradSm, btnOutlineSm } from "@/components/ui/buttons";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-20 bg-white/80 backdrop-blur">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="font-display text-lg font-extrabold">
          Ruang Baby<span className="text-grad">Happy</span>
        </Link>
        <div className="flex gap-2">
          <Link href="/login" className={btnOutlineSm}>Masuk</Link>
          <Link href="/register" className={btnGradSm}>Daftar</Link>
        </div>
      </nav>
    </header>
  );
}
```

- [ ] **Step 3: `src/components/public/Footer.tsx`**

```tsx
import { brand } from "@/lib/brand";

export default function Footer() {
  return (
    <footer className="mt-auto bg-white px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="overflow-hidden rounded-2xl ring-1 ring-black/10">
          <iframe src={brand.mapsEmbed} className="h-40 w-full" loading="lazy" />
        </div>
        <p className="mt-3 text-sm font-semibold text-foreground/70">{brand.alamat}</p>
        <div className="mt-2 flex gap-4 text-sm font-bold">
          <a href={brand.igUrl} className="text-pink-500" target="_blank" rel="noreferrer">📷 @{brand.ig}</a>
        </div>
        <p className="mt-4 text-xs text-foreground/40">© 2026 {brand.nama}</p>
      </div>
    </footer>
  );
}
```

- [ ] **Step 4: `src/components/public/PublicShell.tsx`**

```tsx
import Navbar from "./Navbar";
import Footer from "./Footer";

export default function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      {children}
      <Footer />
    </>
  );
}
```

- [ ] **Step 5: `src/app/page.tsx`** (landing shell — desain penuh di Plan 5)

```tsx
import Link from "next/link";
import PublicShell from "@/components/public/PublicShell";
import { brand } from "@/lib/brand";
import { btnGrad, btnOutline } from "@/components/ui/buttons";

export default function HomePage() {
  return (
    <PublicShell>
      <main className="grad-soft">
        <section className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
          <span className="inline-block rounded-full bg-white px-3 py-1 text-xs font-bold shadow-sm">
            📷 Baby &amp; Kids Photo · {brand.kota}
          </span>
          <h1 className="mt-4 font-display text-4xl font-extrabold leading-tight">
            Abadikan momen <span className="text-grad">si kecil</span> ✨
          </h1>
          <p className="mt-3 font-semibold text-foreground/60">{brand.tagline}</p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/register" className={btnGrad}>Booking Sekarang</Link>
            <Link href="/login" className={btnOutline}>Masuk</Link>
          </div>
        </section>
      </main>
    </PublicShell>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add src/components src/app/page.tsx
git commit -m "feat: komponen publik (Navbar/Footer/PublicShell) + landing shell Baby Happy"
```

---

## Task 7: Auth — profile, register, login, logout

**Files:**
- Create: `src/lib/auth/getCurrentProfile.ts`, `src/app/register/page.tsx`, `src/app/register/actions.ts`, `src/app/login/page.tsx`, `src/app/login/actions.ts`, `src/app/logout/route.ts`

- [ ] **Step 1: `src/lib/auth/getCurrentProfile.ts`** (tanpa total_point)

```ts
import { createClient } from "@/lib/supabase/server";

export type Profile = {
  id: string;
  role: "member" | "admin";
  nama: string | null;
  no_wa: string | null;
  alamat: string | null;
  email: string | null;
};

/** Profile user yang sedang login, atau null jika belum login. */
export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id, role, nama, no_wa, alamat, email")
    .eq("id", user.id)
    .single();

  return (data as Profile) ?? null;
}
```

- [ ] **Step 2: `src/app/register/actions.ts`**

```ts
"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function register(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const nama = String(formData.get("nama") ?? "").trim();
  const no_wa = String(formData.get("no_wa") ?? "").trim();
  const alamat = String(formData.get("alamat") ?? "").trim();

  if (!email || !password || !nama) {
    redirect("/register?error=Data%20wajib%20belum%20lengkap");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error || !data.user) {
    redirect(`/register?error=${encodeURIComponent(error?.message ?? "Gagal daftar")}`);
  }

  // Trigger sudah membuat baris profil; lengkapi datanya (service-role agar pasti tertulis).
  const admin = createAdminClient();
  await admin.from("profiles").update({ nama, no_wa, alamat, email }).eq("id", data.user!.id);

  redirect("/member");
}
```

- [ ] **Step 3: `src/app/register/page.tsx`**

```tsx
import { register } from "./actions";
import PublicShell from "@/components/public/PublicShell";
import { btnGrad } from "@/components/ui/buttons";

const inputCls = "rounded-xl bg-cream px-4 py-3 text-sm ring-1 ring-black/5 placeholder-foreground/40";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <PublicShell>
      <main className="grad-soft min-h-[70vh]">
        <div className="mx-auto w-full max-w-md px-4 py-12 sm:px-6">
          <h1 className="font-display text-2xl font-extrabold">Daftar Akun 🎀</h1>
          <p className="mt-1 text-sm font-semibold text-foreground/55">Booking wajib punya akun untuk tracking pesanan.</p>
          {error && (
            <p className="mt-3 rounded-lg bg-red-100 p-2 text-sm font-semibold text-red-600">{error}</p>
          )}
          <form action={register} className="mt-4 flex flex-col gap-3">
            <input name="nama" placeholder="Nama lengkap" className={inputCls} required />
            <input name="no_wa" placeholder="No. WhatsApp" className={inputCls} />
            <input name="alamat" placeholder="Alamat" className={inputCls} />
            <input name="email" type="email" placeholder="Email" className={inputCls} required />
            <input name="password" type="password" placeholder="Password" className={inputCls} required />
            <button className={`${btnGrad} w-full`}>Buat Akun</button>
          </form>
          <p className="mt-3 text-sm font-semibold text-foreground/60">
            Sudah punya akun? <a className="text-grad font-bold" href="/login">Masuk</a>
          </p>
        </div>
      </main>
    </PublicShell>
  );
}
```

> Catatan: kelas `bg-cream` memetakan ke warna `--color-background` (#fff8f3) tema; tersedia otomatis via Tailwind v4 `@theme`. Bila perlu, ganti ke `bg-white`.

- [ ] **Step 4: `src/app/login/actions.ts`**

```ts
"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user!.id).single();

  redirect(profile?.role === "admin" ? "/admin" : "/member");
}
```

- [ ] **Step 5: `src/app/login/page.tsx`**

```tsx
import { login } from "./actions";
import PublicShell from "@/components/public/PublicShell";
import { btnGrad } from "@/components/ui/buttons";

const inputCls = "rounded-xl bg-cream px-4 py-3 text-sm ring-1 ring-black/5 placeholder-foreground/40";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <PublicShell>
      <main className="grad-soft min-h-[70vh]">
        <div className="mx-auto w-full max-w-md px-4 py-12 sm:px-6">
          <h1 className="font-display text-2xl font-extrabold">Masuk</h1>
          {error && (
            <p className="mt-3 rounded-lg bg-red-100 p-2 text-sm font-semibold text-red-600">{error}</p>
          )}
          <form action={login} className="mt-4 flex flex-col gap-3">
            <input name="email" type="email" placeholder="Email" className={inputCls} required />
            <input name="password" type="password" placeholder="Password" className={inputCls} required />
            <button className={`${btnGrad} w-full`}>Masuk</button>
          </form>
          <p className="mt-3 text-sm font-semibold text-foreground/60">
            Belum punya akun? <a className="text-grad font-bold" href="/register">Daftar</a>
          </p>
        </div>
      </main>
    </PublicShell>
  );
}
```

- [ ] **Step 6: `src/app/logout/route.ts`**

```ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/login", request.url), 303);
}
```

- [ ] **Step 7: Commit**

```bash
git add src/lib/auth src/app/register src/app/login src/app/logout
git commit -m "feat(auth): getCurrentProfile + register/login/logout (member-only)"
```

---

## Task 8: Proxy (gate /member & /admin) + halaman placeholder

**Files:**
- Create: `src/proxy.ts`, `src/app/member/page.tsx`, `src/app/admin/page.tsx`

- [ ] **Step 1: `src/proxy.ts`**

```ts
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Next.js 16: file "proxy" (pengganti "middleware"). Proteksi /member & /admin.
export async function proxy(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  const needsAuth = path.startsWith("/member") || path.startsWith("/admin");

  if (needsAuth && !user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (path.startsWith("/admin") && user) {
    const { data: profile } = await supabase
      .from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") {
      return NextResponse.redirect(new URL("/member", request.url));
    }
  }

  return response;
}

export const config = { matcher: ["/member/:path*", "/admin/:path*"] };
```

- [ ] **Step 2: `src/app/member/page.tsx`** (placeholder — diisi Plan 4)

```tsx
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";

export default async function MemberPage() {
  const profile = await getCurrentProfile();
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-2xl font-extrabold">Halo, {profile?.nama ?? "Member"} 👋</h1>
      <p className="mt-2 font-semibold text-foreground/60">Dashboard member — riwayat booking & tracking menyusul.</p>
      <form action="/logout" method="post" className="mt-4">
        <button className="rounded-full bg-white px-4 py-2 text-sm font-bold ring-1 ring-black/10">Keluar</button>
      </form>
    </main>
  );
}
```

- [ ] **Step 3: `src/app/admin/page.tsx`** (placeholder — diisi Plan 2/4)

```tsx
export default function AdminHome() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold text-slate-800">Panel Admin</h1>
      <p className="mt-2 text-slate-500">Master data & transaksi menyusul (Plan 2 &amp; 4).</p>
      <form action="/logout" method="post" className="mt-4">
        <button className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-bold text-white">Keluar</button>
      </form>
    </main>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/proxy.ts src/app/member src/app/admin
git commit -m "feat: proxy gate /member & /admin + halaman placeholder"
```

---

## Task 9: Verifikasi build + E2E smoke

**Files:**
- Create: `tests/e2e/smoke.spec.ts`

- [ ] **Step 1: Tulis E2E smoke `tests/e2e/smoke.spec.ts`** (tidak butuh tulis-DB; cukup render + gate)

```ts
import { test, expect } from "@playwright/test";

test("landing tampil dengan brand & CTA", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /si kecil/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /Booking Sekarang/i })).toBeVisible();
});

test("akses /admin tanpa login diarahkan ke /login", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login/);
});

test("akses /member tanpa login diarahkan ke /login", async ({ page }) => {
  await page.goto("/member");
  await expect(page).toHaveURL(/\/login/);
});
```

- [ ] **Step 2: Verifikasi unit test hijau**

Run: `npm run test`
Expected: PASS (suite `rupiah`).

- [ ] **Step 3: Verifikasi build**

Run: `npm run build`
Expected: build sukses; route `/`, `/login`, `/register`, `/member`, `/admin` ter-compile (tanpa error TypeScript).

> Prasyarat: `.env.local` sudah terisi (Task 11) agar build yang menyentuh Supabase tidak gagal. Bila Supabase belum siap, build tetap bisa lewat karena env hanya dipakai saat runtime; namun E2E (Step 4) butuh dev server + env.

- [ ] **Step 4: Jalankan E2E smoke**

Run: `npm run test:e2e -- smoke`
Expected: 3 test × 2 project (desktop+mobile) = 6 PASS. (Gate redirect tak butuh user; landing tak butuh DB.)

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/smoke.spec.ts
git commit -m "test(e2e): smoke landing + gate /admin & /member"
```

---

## Task 10: README ringkas

**Files:**
- Create: `README.md`

- [ ] **Step 1: `README.md`**

```markdown
# Ruang Baby Happy

Booking online sesi foto bayi & anak (newborn, cakesmash, maternity, sitter). Next.js 16 + Supabase. Wajib login, 2 sesi/hari (kapasitas per layanan), home service ongkos per zona, DP 30% per paket, tracking status pengerjaan.

## Setup
1. `npm install`
2. Buat project Supabase baru, salin `.env.example` → `.env.local`, isi URL/anon/service-role key.
3. Jalankan migrasi `supabase/migrations/0001_init.sql`, `0002_rls.sql`, `0003_rpc.sql` lewat SQL Editor Supabase (urut).
4. `npm run dev` → http://localhost:3000

## Test
- Unit: `npm run test`
- E2E (desktop+mobile): `npm run test:e2e`

Spec & plan: `docs/superpowers/`.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: README setup ringkas"
```

---

## Task 11: (Manual user) Konfigurasi Supabase `.env.local`

- [ ] **Step 1:** Buat project baru di https://supabase.com (region terdekat, mis. Singapore).
- [ ] **Step 2:** Salin `.env.example` → `.env.local`; isi `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Settings → API), `SUPABASE_SERVICE_ROLE_KEY` (service_role, rahasia), `NEXT_PUBLIC_ADMIN_WA` (nomor WA umum).
- [ ] **Step 3:** Pastikan `.env.local` ter-ignore git (sudah di `.gitignore`).

---

## Task 12: (Manual user) Apply migrasi + buat admin pertama

- [ ] **Step 1:** Buka Supabase → SQL Editor → jalankan isi `0001_init.sql`, lalu `0002_rls.sql`, lalu `0003_rpc.sql` (berurutan).
- [ ] **Step 2:** Daftar 1 akun lewat `/register` (mis. email admin studio).
- [ ] **Step 3:** Di SQL Editor, jadikan admin:

```sql
update public.profiles set role = 'admin' where email = 'EMAIL_ADMIN_ANDA';
```

- [ ] **Step 4:** Login ulang → harus diarahkan ke `/admin`.

---

## Self-Review (plan vs spec)

- **Skema (spec §3):** profiles tanpa total_point ✓, layanan+admin_wa ✓, sesi ✓, package (+layanan_id, diskon_returning, dp_persen, durasi) ✓, zona_ongkos ✓, booking (sesi_id, anak_*, lokasi_sesi, zona_id, alamat_sesi, status_pengerjaan, customer wajib, tanpa guest) ✓, payment (+ongkos, +diskon, tanpa point_granted) ✓, storage bucket bukti-tf/galeri → **dibuat di Plan 3/4 saat dipakai** (dicatat di sana, bukan gap).
- **Auth wajib login (spec §1, §7):** register/login member-only ✓; proxy gate /member,/admin ✓; gate **form booking** → Plan 3 (saat halaman/aksi booking dibuat).
- **RLS/RPC:** is_admin, trigger profil, policies, set_payment_lunas tanpa poin ✓ (sesuai keputusan buang loyalitas).
- **Tema Baby Happy (spec §8):** token pastel + font Baloo2/Nunito + landing shell ✓ (desain penuh Plan 5).
- **Tidak ada placeholder kode** — tiap step memuat isi file lengkap. Halaman `/member` & `/admin` sengaja placeholder (ditandai, diisi plan berikut) — bukan placeholder kode, melainkan scope bertahap.
- **Konsistensi tipe:** `Profile` (tanpa total_point) dipakai konsisten; `formatRupiah`, `brand`, `btnGrad` cocok antarfile.
```
