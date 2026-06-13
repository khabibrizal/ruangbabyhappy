-- Cleanup OPSIONAL (jalankan SETELAH deploy kode baru yang memakai package.bisa_*).
-- Menghapus kolom lokasi yang keliru ditaruh di sesi pada 0008.
alter table public.sesi drop constraint if exists sesi_lokasi_min1;
alter table public.sesi drop column if exists bisa_studio;
alter table public.sesi drop column if exists bisa_home;
