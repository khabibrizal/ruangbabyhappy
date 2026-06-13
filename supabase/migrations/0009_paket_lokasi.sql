-- Kapabilitas lokasi per PAKET (bukan sesi): apakah paket ini bisa di studio
-- dan/atau home service. Default keduanya true => perilaku lama (member melihat
-- kedua opsi) tetap. Menggantikan pendekatan 0008 (yang keliru menaruh di sesi).
alter table public.package add column if not exists bisa_studio boolean not null default true;
alter table public.package add column if not exists bisa_home boolean not null default true;

-- Minimal satu lokasi harus aktif.
alter table public.package drop constraint if exists package_lokasi_min1;
alter table public.package add constraint package_lokasi_min1 check (bisa_studio or bisa_home);
