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
