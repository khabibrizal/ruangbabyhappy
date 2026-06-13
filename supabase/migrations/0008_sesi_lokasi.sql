-- Kapabilitas lokasi per sesi: apakah sesi ini bisa di studio dan/atau home service.
-- Default keduanya true => perilaku lama (member melihat kedua opsi) tetap.
alter table public.sesi add column if not exists bisa_studio boolean not null default true;
alter table public.sesi add column if not exists bisa_home boolean not null default true;

-- Minimal satu lokasi harus aktif (sesi tanpa lokasi = tidak bisa dibooking).
alter table public.sesi drop constraint if exists sesi_lokasi_min1;
alter table public.sesi add constraint sesi_lokasi_min1 check (bisa_studio or bisa_home);
