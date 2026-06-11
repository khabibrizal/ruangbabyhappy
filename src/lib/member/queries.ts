import { createClient } from "@/lib/supabase/server";

export type RiwayatBooking = {
  kode_booking: string;
  tanggal: string;
  jam_mulai: string;
  lokasi_sesi: string;
  anak_nama: string;
  status_booking: string;
  status_pengerjaan: string | null;
  sesi: { nama: string } | null;
  package: { nama: string; layanan: { nama: string } | null } | null;
  payment: { status_bayar: string; total: number; ongkos: number; diskon: number; dp_amount: number | null } | null;
};

/** History booking milik user aktif. RLS booking_owner_select membatasi ke miliknya. */
export async function getMyBookings(): Promise<RiwayatBooking[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("booking")
    .select(
      "kode_booking, tanggal, jam_mulai, lokasi_sesi, anak_nama, status_booking, status_pengerjaan, " +
        "sesi:sesi_id(nama), package:package_id(nama, layanan:layanan_id(nama)), " +
        "payment(status_bayar, total, ongkos, diskon, dp_amount)",
    )
    .order("created_at", { ascending: false });
  return (data as unknown as RiwayatBooking[]) ?? [];
}
