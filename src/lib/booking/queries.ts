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

// ============ Admin: daftar & detail transaksi ============

export type TransaksiRow = {
  id: string;
  kode_booking: string;
  tanggal: string;
  anak_nama: string;
  status_booking: string;
  status_pengerjaan: string | null;
  sesi: { nama: string } | null;
  package: { nama: string; layanan: { nama: string } | null } | null;
  payment: { id: string; status_bayar: string; total: number; ongkos: number; diskon: number; bukti_url: string | null } | null;
  profile: { nama: string | null } | null;
  bukti_signed_url: string | null;
};

export type FilterTransaksi = { status?: string; pengerjaan?: string; dari?: string; sampai?: string; page?: number };
export const TRANSAKSI_PER_PAGE = 10;
export type HasilTransaksi = { rows: TransaksiRow[]; total: number };

export async function listTransaksiAdmin(filter: FilterTransaksi = {}): Promise<HasilTransaksi> {
  const admin = createAdminClient();
  const page = Math.max(1, filter.page ?? 1);
  const from = (page - 1) * TRANSAKSI_PER_PAGE;
  const to = from + TRANSAKSI_PER_PAGE - 1;

  const paymentSelect = filter.status
    ? "payment!inner(id, status_bayar, total, ongkos, diskon, bukti_url)"
    : "payment(id, status_bayar, total, ongkos, diskon, bukti_url)";

  let q = admin
    .from("booking")
    .select(
      "id, kode_booking, tanggal, anak_nama, status_booking, status_pengerjaan, " +
        "sesi:sesi_id(nama), package:package_id(nama, layanan:layanan_id(nama)), " +
        "profile:customer_profile_id(nama), " +
        paymentSelect,
      { count: "exact" },
    )
    .order("created_at", { ascending: false });

  if (filter.status) q = q.eq("payment.status_bayar", filter.status);
  if (filter.dari) q = q.gte("tanggal", filter.dari);
  if (filter.sampai) q = q.lte("tanggal", filter.sampai);
  if (filter.pengerjaan === "belum") q = q.is("status_pengerjaan", null);
  else if (filter.pengerjaan) q = q.eq("status_pengerjaan", filter.pengerjaan);

  const { data, count } = await q.range(from, to);
  const rows = (data as unknown as Omit<TransaksiRow, "bukti_signed_url">[]) ?? [];

  const withSigned = await Promise.all(
    rows.map(async (r) => {
      let bukti_signed_url: string | null = null;
      const path = r.payment?.bukti_url;
      if (path) {
        const { data: signed } = await admin.storage.from("bukti-tf").createSignedUrl(path, 3600);
        bukti_signed_url = signed?.signedUrl ?? null;
      }
      return { ...r, bukti_signed_url };
    }),
  );
  return { rows: withSigned, total: count ?? 0 };
}

export type DetailTransaksi = {
  id: string;
  kode_booking: string;
  tanggal: string;
  jam_mulai: string;
  status_booking: string;
  status_pengerjaan: string | null;
  anak_nama: string;
  anak_bb: number;
  anak_jk: string;
  lokasi_sesi: string;
  alamat_sesi: string | null;
  sesi_id: string;
  package_id: string;
  sesi: { nama: string } | null;
  zona: { nama: string } | null;
  package: { nama: string; harga: number; durasi_menit: number; dp_persen: number; layanan_id: string; layanan: { nama: string; admin_wa: string } | null } | null;
  payment: { id: string; status_bayar: string; total: number; ongkos: number; diskon: number; dp_amount: number | null; bukti_url: string | null } | null;
  profile: { nama: string | null; email: string | null; no_wa: string | null; alamat: string | null } | null;
  bukti_signed_url: string | null;
};

export async function getDetailTransaksi(kode: string): Promise<DetailTransaksi | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("booking")
    .select(
      "id, kode_booking, tanggal, jam_mulai, status_booking, status_pengerjaan, " +
        "anak_nama, anak_bb, anak_jk, lokasi_sesi, alamat_sesi, sesi_id, package_id, " +
        "sesi:sesi_id(nama), zona:zona_id(nama), " +
        "package:package_id(nama, harga, durasi_menit, dp_persen, layanan_id, layanan:layanan_id(nama, admin_wa)), " +
        "payment(id, status_bayar, total, ongkos, diskon, dp_amount, bukti_url), " +
        "profile:customer_profile_id(nama, email, no_wa, alamat)",
    )
    .eq("kode_booking", kode)
    .maybeSingle();
  if (!data) return null;
  const row = data as unknown as Omit<DetailTransaksi, "bukti_signed_url">;

  let bukti_signed_url: string | null = null;
  const path = row.payment?.bukti_url;
  if (path) {
    const { data: signed } = await admin.storage.from("bukti-tf").createSignedUrl(path, 3600);
    bukti_signed_url = signed?.signedUrl ?? null;
  }
  return { ...row, bukti_signed_url };
}
