-- Link Google Drive hasil foto (per booking)
alter table public.booking add column if not exists drive_url text;

-- Rekening transfer per layanan (WA sudah ada: layanan.admin_wa)
alter table public.layanan add column if not exists bank text;
alter table public.layanan add column if not exists no_rek text;
alter table public.layanan add column if not exists atas_nama text;
