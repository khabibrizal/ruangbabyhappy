create table public.booking_item (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.booking (id) on delete cascade,
  package_id uuid not null references public.package (id),
  qty integer not null default 1 check (qty >= 1),
  harga integer not null,            -- snapshot harga satuan saat transaksi
  created_at timestamptz not null default now()
);
create index on public.booking_item (booking_id);
alter table public.booking_item enable row level security;
-- baca bila admin atau pemilik booking; tulis lewat server service-role.
create policy bi_select on public.booking_item for select using (
  public.is_admin() or exists (
    select 1 from public.booking b where b.id = booking_item.booking_id and b.customer_profile_id = auth.uid()
  )
);
