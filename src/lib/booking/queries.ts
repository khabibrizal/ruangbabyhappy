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

  const d = data as unknown as {
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
    package: { nama: string; durasi_menit: number; layanan: { nama: string; admin_wa: string } | null } | null;
    payment: BookingKonfirmasi["payment"];
  };
  const pkg = d.package;

  return {
    kode_booking: d.kode_booking,
    tanggal: d.tanggal,
    jam_mulai: d.jam_mulai,
    anak_nama: d.anak_nama,
    anak_bb: d.anak_bb,
    anak_jk: d.anak_jk,
    lokasi_sesi: d.lokasi_sesi,
    alamat_sesi: d.alamat_sesi ?? null,
    sesi: d.sesi ?? null,
    zona: d.zona ?? null,
    package: pkg ? { nama: pkg.nama, durasi_menit: pkg.durasi_menit } : null,
    layanan_nama: pkg?.layanan?.nama ?? "",
    layanan_admin_wa: pkg?.layanan?.admin_wa ?? "",
    payment: d.payment ?? null,
  };
}
