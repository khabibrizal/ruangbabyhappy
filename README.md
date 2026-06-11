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
