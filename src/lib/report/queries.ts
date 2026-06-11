import { createAdminClient } from "@/lib/supabase/admin";

export type FilterLaporan = { dari?: string; sampai?: string; status?: string };

export type BarisLaporan = {
  kode_booking: string;
  tanggal: string;
  anak_nama: string;
  status_booking: string;
  sesi: { nama: string } | null;
  package: { nama: string; layanan: { nama: string } | null } | null;
  profile: { nama: string | null } | null;
  payment: { status_bayar: string; total: number; ongkos: number; diskon: number; dp_amount: number | null } | null;
};

export async function getLaporan(f: FilterLaporan): Promise<BarisLaporan[]> {
  const admin = createAdminClient();
  let q = admin
    .from("booking")
    .select(
      "kode_booking, tanggal, anak_nama, status_booking, " +
        "sesi:sesi_id(nama), package:package_id(nama, layanan:layanan_id(nama)), " +
        "profile:customer_profile_id(nama), " +
        "payment(status_bayar, total, ongkos, diskon, dp_amount)",
    )
    .order("tanggal", { ascending: false });
  if (f.dari) q = q.gte("tanggal", f.dari);
  if (f.sampai) q = q.lte("tanggal", f.sampai);
  const { data } = await q;
  let rows = (data as unknown as BarisLaporan[]) ?? [];
  if (f.status) rows = rows.filter((r) => (r.payment?.status_bayar ?? "unpaid") === f.status);
  return rows;
}
