-- Dukungan customer "legacy" tanpa akun login + kolom Instagram.
--
-- 1) Longgarkan keterkaitan profiles -> auth.users supaya profil bisa berdiri
--    sendiri (customer lama hasil impor yang belum/tak punya akun login).
--    Trigger handle_new_user tetap jalan utk signup (id diisi eksplisit dari auth).
--    Catatan: ini juga menghapus ON DELETE CASCADE dari auth.users (hapus user
--    auth tak lagi otomatis menghapus profil — dampak minor).
alter table public.profiles drop constraint if exists profiles_id_fkey;
alter table public.profiles alter column id set default gen_random_uuid();

-- 2) Kolom Instagram (kontak penting utk studio foto).
alter table public.profiles add column if not exists ig text;
