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
  layanan_bank: string | null;
  layanan_no_rek: string | null;
  layanan_atas_nama: string | null;
  vendor_nama: string | null;
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
        "package:package_id(nama, durasi_menit, layanan:layanan_id(nama, admin_wa, bank, no_rek, atas_nama, vendor:vendor_id(nama))), " +
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
    package: { nama: string; durasi_menit: number; layanan: { nama: string; admin_wa: string; bank: string | null; no_rek: string | null; atas_nama: string | null; vendor: { nama: string } | null } | null } | null;
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
    layanan_bank: pkg?.layanan?.bank ?? null,
    layanan_no_rek: pkg?.layanan?.no_rek ?? null,
    layanan_atas_nama: pkg?.layanan?.atas_nama ?? null,
    vendor_nama: pkg?.layanan?.vendor?.nama ?? null,
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
  drive_url: string | null;
  sesi_id: string;
  package_id: string;
  sesi: { nama: string } | null;
  zona: { nama: string } | null;
  package: { nama: string; harga: number; durasi_menit: number; dp_persen: number; layanan_id: string; layanan: { nama: string; admin_wa: string; bank: string | null; no_rek: string | null; atas_nama: string | null; vendor: { nama: string; tagline: string | null; ig: string | null; alamat: string | null } | null } | null } | null;
  payment: { id: string; status_bayar: string; total: number; ongkos: number; diskon: number; dp_amount: number | null; bukti_url: string | null } | null;
  profile: { nama: string | null; email: string | null; no_wa: string | null; alamat: string | null } | null;
  vendor_nama: string | null;
  vendor_tagline: string | null;
  vendor_ig: string | null;
  vendor_alamat: string | null;
  bukti_signed_url: string | null;
};

export async function getDetailTransaksi(kode: string): Promise<DetailTransaksi | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("booking")
    .select(
      "id, kode_booking, tanggal, jam_mulai, status_booking, status_pengerjaan, " +
        "anak_nama, anak_bb, anak_jk, lokasi_sesi, alamat_sesi, drive_url, sesi_id, package_id, " +
        "sesi:sesi_id(nama), zona:zona_id(nama), " +
        "package:package_id(nama, harga, durasi_menit, dp_persen, layanan_id, layanan:layanan_id(nama, admin_wa, bank, no_rek, atas_nama, vendor:vendor_id(nama, tagline, ig, alamat))), " +
        "payment(id, status_bayar, total, ongkos, diskon, dp_amount, bukti_url), " +
        "profile:customer_profile_id(nama, email, no_wa, alamat)",
    )
    .eq("kode_booking", kode)
    .maybeSingle();
  if (!data) return null;
  const row = data as unknown as Omit<DetailTransaksi, "bukti_signed_url" | "vendor_nama" | "vendor_tagline" | "vendor_ig" | "vendor_alamat">;
  const ven = row.package?.layanan?.vendor ?? null;

  let bukti_signed_url: string | null = null;
  const path = row.payment?.bukti_url;
  if (path) {
    const { data: signed } = await admin.storage.from("bukti-tf").createSignedUrl(path, 3600);
    bukti_signed_url = signed?.signedUrl ?? null;
  }
  return {
    ...row,
    vendor_nama: ven?.nama ?? null,
    vendor_tagline: ven?.tagline ?? null,
    vendor_ig: ven?.ig ?? null,
    vendor_alamat: ven?.alamat ?? null,
    bukti_signed_url,
  };
}

export type JadwalItem = {
  kode_booking: string;
  tanggal: string;
  jam_mulai: string;
  sesi_nama: string;
  nama: string;
  status_bayar: string;
};

/** Booking dalam satu bulan ("YYYY-MM") untuk kalender admin (semua status). */
export async function listJadwalBulan(bulan: string): Promise<JadwalItem[]> {
  const admin = createAdminClient();
  const [y, m] = bulan.split("-").map(Number);
  const hariTerakhir = new Date(y, m, 0).getDate();
  const dari = `${bulan}-01`;
  const sampai = `${bulan}-${String(hariTerakhir).padStart(2, "0")}`;

  const { data } = await admin
    .from("booking")
    .select("kode_booking, tanggal, jam_mulai, sesi:sesi_id(nama), profile:customer_profile_id(nama), payment(status_bayar)")
    .gte("tanggal", dari)
    .lte("tanggal", sampai)
    .order("jam_mulai", { ascending: true });

  const rows = (data as unknown as {
    kode_booking: string; tanggal: string; jam_mulai: string;
    sesi: { nama: string } | null; profile: { nama: string | null } | null; payment: { status_bayar: string } | null;
  }[]) ?? [];

  return rows.map((r) => ({
    kode_booking: r.kode_booking,
    tanggal: r.tanggal,
    jam_mulai: r.jam_mulai,
    sesi_nama: r.sesi?.nama ?? "",
    nama: r.profile?.nama ?? "Member",
    status_bayar: r.payment?.status_bayar ?? "unpaid",
  }));
}

export type BookingItem = { nama: string; qty: number; harga: number };

/** Item-item paket pada sebuah booking (multi-item admin). Kosong utk booking 1-paket lama. */
export async function getBookingItems(bookingId: string): Promise<BookingItem[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("booking_item")
    .select("qty, harga, package:package_id(nama)")
    .eq("booking_id", bookingId)
    .order("created_at");
  const rows = (data as unknown as { qty: number; harga: number; package: { nama: string } | null }[]) ?? [];
  return rows.map((r) => ({ nama: r.package?.nama ?? "-", qty: r.qty, harga: r.harga }));
}
