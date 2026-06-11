import { createAdminClient } from "@/lib/supabase/admin";

export type BookingKonfirmasi = {
  kode_booking: string;
  tanggal: string;
  jam_mulai: string;
  anak_nama: string;
  anak_bb: number;
  anak_jk: string;
  lokasi_sesi: string;
  alamat_sesi: string | null;
  sesi: { nama: string } | null;
  zona: { nama: string } | null;
  package: { nama: string; durasi_menit: number } | null;
  layanan_nama: string;
  layanan_admin_wa: string;
  payment: { status_bayar: string; total: number; ongkos: number; diskon: number; dp_amount: number | null } | null;
};

/** Ambil booking berdasarkan kode (service-role; kode = token kapabilitas). */
export async function getBookingByKode(kode: string): Promise<BookingKonfirmasi | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("booking")
    .select(
      "kode_booking, tanggal, jam_mulai, anak_nama, anak_bb, anak_jk, lokasi_sesi, alamat_sesi, " +
        "sesi:sesi_id(nama), zona:zona_id(nama), " +
        "package:package_id(nama, durasi_menit, layanan:layanan_id(nama, admin_wa)), " +
        "payment(status_bayar, total, ongkos, diskon, dp_amount)",
    )
    .eq("kode_booking", kode)
    .maybeSingle();
  if (!data) return null;

  const pkg = data.package as unknown as
    | { nama: string; durasi_menit: number; layanan: { nama: string; admin_wa: string } | null }
    | null;

  return {
    kode_booking: data.kode_booking as string,
    tanggal: data.tanggal as string,
    jam_mulai: data.jam_mulai as string,
    anak_nama: data.anak_nama as string,
    anak_bb: data.anak_bb as number,
    anak_jk: data.anak_jk as string,
    lokasi_sesi: data.lokasi_sesi as string,
    alamat_sesi: (data.alamat_sesi as string) ?? null,
    sesi: (data.sesi as unknown as { nama: string }) ?? null,
    zona: (data.zona as unknown as { nama: string }) ?? null,
    package: pkg ? { nama: pkg.nama, durasi_menit: pkg.durasi_menit } : null,
    layanan_nama: pkg?.layanan?.nama ?? "",
    layanan_admin_wa: pkg?.layanan?.admin_wa ?? "",
    payment: (data.payment as unknown as BookingKonfirmasi["payment"]) ?? null,
  };
}
