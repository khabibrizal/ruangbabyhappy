-- Set pembayaran -> lunas + booking -> completed. (Tanpa poin; loyalitas tidak dipakai.)
-- SECURITY DEFINER: dipanggil server (service-role) maupun admin terautentikasi.
create or replace function public.set_payment_lunas(p_payment_id uuid, p_admin uuid)
returns void language plpgsql security definer as $$
declare
  v_booking_id uuid;
begin
  select booking_id into v_booking_id
  from public.payment where id = p_payment_id for update;
  if v_booking_id is null then
    raise exception 'payment % tidak ditemukan', p_payment_id;
  end if;

  update public.payment
    set status_bayar = 'lunas', dibayar_at = now(), dicatat_oleh = p_admin
    where id = p_payment_id;
  update public.booking set status_booking = 'completed' where id = v_booking_id;
end;
$$;
