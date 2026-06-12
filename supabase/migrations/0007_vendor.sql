-- Multi-vendor: brand identitas (mis. Ruang Baby Happy, fillens.picture)
create table public.vendor (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  nama text not null,
  tagline text,
  ig text,
  alamat text,
  is_default boolean not null default false,
  butuh_anak boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.vendor enable row level security;
create policy vendor_read on public.vendor for select using (true);
create policy vendor_write on public.vendor for all using (public.is_admin()) with check (public.is_admin());

insert into public.vendor (slug, nama, tagline, ig, is_default, butuh_anak) values
  ('ruangbabyhappy', 'Ruang Baby Happy', 'imagine your little moment', 'ruangbabyhappy', true, true),
  ('fillens', 'fillens.picture', 'your wedding story', 'fillens.picture', false, false);

-- Layanan milik vendor (default = baby vendor)
alter table public.layanan add column if not exists vendor_id uuid references public.vendor (id);
update public.layanan set vendor_id = (select id from public.vendor where is_default limit 1) where vendor_id is null;

-- Data anak opsional (utk layanan non-bayi spt wedding)
alter table public.booking alter column anak_nama drop not null;
alter table public.booking alter column anak_bb drop not null;
alter table public.booking alter column anak_jk drop not null;
alter table public.booking drop constraint if exists booking_anak_jk_check;
alter table public.booking add constraint booking_anak_jk_check check (anak_jk is null or anak_jk in ('L','P'));
