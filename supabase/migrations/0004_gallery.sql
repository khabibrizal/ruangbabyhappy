create table public.gallery (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  created_at timestamptz not null default now()
);
alter table public.gallery enable row level security;
create policy gallery_read on public.gallery for select using (true);
