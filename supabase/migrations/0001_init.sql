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
