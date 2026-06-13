-- Indeks utk query riwayat transaksi per customer (Master Customer detail).
-- Tanpa ini, filter booking.customer_profile_id melakukan sequential scan.
create index if not exists booking_customer_profile_id_idx
  on public.booking (customer_profile_id);
