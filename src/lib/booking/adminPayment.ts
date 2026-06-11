"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { getSesiTersedia } from "./sesiAvailability";
import { hitungDp } from "./hitung";
import { TAHAP_PENGERJAAN } from "./statusPengerjaan";

async function guardAdmin() {
  const me = await getCurrentProfile();
  if (me?.role !== "admin") throw new Error("forbidden");
  return me;
}

function navSuffix(formData: FormData): string {
  if (String(formData.get("ref") ?? "") !== "jadwal") return "";
  const bulan = String(formData.get("bulan") ?? "");
  return `&ref=jadwal${bulan ? `&bulan=${encodeURIComponent(bulan)}` : ""}`;
}

/**
 * Simpan detail pembayaran: override ongkos & diskon, set status bayar.
 * DP dihitung ulang = (total + ongkos − diskon) × dp_persen. Guard kapasitas
 * per (layanan, sesi, tanggal) saat menuju dp_paid/lunas.
 */
export async function simpanDetailTransaksi(formData: FormData) {
  const me = await guardAdmin();
  const bookingId = String(formData.get("bookingId") ?? "");
  const paymentId = String(formData.get("paymentId") ?? "");
  const kode = String(formData.get("kode") ?? "");
  const status = String(formData.get("status") ?? "unpaid");
  const ongkos = Math.max(0, Number(formData.get("ongkos") ?? 0));
  const diskon = Math.max(0, Number(formData.get("diskon") ?? 0));
  const admin = createAdminClient();

  // Ambil booking (sesi, tanggal, layanan, dp_persen, total).
  const { data: b } = await admin
    .from("booking")
    .select("sesi_id, tanggal, package:package_id(layanan_id, dp_persen), payment(total)")
    .eq("id", bookingId)
    .single();
  if (!b) redirect(`/admin/transaksi/${kode}?error=Booking%20tidak%20ditemukan${navSuffix(formData)}`);
  const bb = b as unknown as {
    sesi_id: string;
    tanggal: string;
    package: { layanan_id: string; dp_persen: number } | null;
    payment: { total: number } | null;
  };
  const pkg = bb.package;
  const total = bb.payment?.total ?? 0;

  // Guard kapasitas per layanan: tak boleh terbayar bila sesi+tanggal+layanan sudah diisi booking terbayar LAIN.
  if (status === "dp_paid" || status === "lunas") {
    const { data: lain } = await admin
      .from("booking")
      .select("id, package!inner(layanan_id), payment!inner(status_bayar)")
      .eq("tanggal", bb.tanggal)
      .eq("sesi_id", bb.sesi_id)
      .eq("package.layanan_id", pkg?.layanan_id ?? "")
      .in("payment.status_bayar", ["dp_paid", "lunas"])
      .neq("id", bookingId);
    if ((lain ?? []).length > 0) {
      redirect(`/admin/transaksi/${kode}?error=Sesi%20sudah%20terisi%20booking%20lain%20di%20layanan%20ini${navSuffix(formData)}`);
    }
  }

  const dp = hitungDp(total + ongkos - diskon, pkg?.dp_persen ?? 30);

  // Selalu simpan ongkos/diskon/dp.
  await admin.from("payment").update({ ongkos, diskon, dp_amount: dp }).eq("id", paymentId);

  if (status === "lunas") {
    const { error } = await admin.rpc("set_payment_lunas", { p_payment_id: paymentId, p_admin: me.id });
    if (error) redirect(`/admin/transaksi/${kode}?error=${encodeURIComponent(error.message)}${navSuffix(formData)}`);
  } else if (status === "dp_paid") {
    await admin.from("payment").update({ status_bayar: "dp_paid", dibayar_at: new Date().toISOString(), dicatat_oleh: me.id }).eq("id", paymentId);
    await admin.from("booking").update({ status_booking: "confirmed" }).eq("id", bookingId);
  } else {
    await admin.from("payment").update({ status_bayar: "unpaid" }).eq("id", paymentId);
    await admin.from("booking").update({ status_booking: "pending" }).eq("id", bookingId);
  }

  revalidatePath(`/admin/transaksi/${kode}`);
  revalidatePath("/admin/transaksi");
  redirect(`/admin/transaksi/${kode}?ok=1${navSuffix(formData)}`);
}

/** Atur status pengerjaan foto (boleh dikosongkan -> belum mulai / NULL). */
export async function updateStatusPengerjaan(formData: FormData) {
  await guardAdmin();
  const bookingId = String(formData.get("bookingId") ?? "");
  const kode = String(formData.get("kode") ?? "");
  const raw = String(formData.get("status_pengerjaan") ?? "");
  const nilai = (TAHAP_PENGERJAAN as readonly string[]).includes(raw) ? raw : null;
  const admin = createAdminClient();
  await admin.from("booking").update({ status_pengerjaan: nilai }).eq("id", bookingId);
  revalidatePath(`/admin/transaksi/${kode}`);
  redirect(`/admin/transaksi/${kode}?ok=1${navSuffix(formData)}`);
}

/** Reschedule: ubah paket/tanggal/sesi dengan validasi ketersediaan sesi (kapasitas per layanan). */
export async function rescheduleBooking(formData: FormData) {
  await guardAdmin();
  const bookingId = String(formData.get("bookingId") ?? "");
  const kode = String(formData.get("kode") ?? "");
  const packageId = String(formData.get("packageId") ?? "");
  const tanggal = String(formData.get("tanggal") ?? "");
  const sesiId = String(formData.get("sesiId") ?? "");
  const admin = createAdminClient();

  const tersedia = await getSesiTersedia(packageId, tanggal);
  const sesi = tersedia.find((s) => s.id === sesiId);
  if (!sesi) redirect(`/admin/transaksi/${kode}?error=Sesi%20tujuan%20tidak%20tersedia${navSuffix(formData)}`);

  await admin
    .from("booking")
    .update({ package_id: packageId, tanggal, sesi_id: sesiId, jam_mulai: sesi!.jam_mulai })
    .eq("id", bookingId);

  revalidatePath(`/admin/transaksi/${kode}`);
  revalidatePath("/admin/transaksi");
  redirect(`/admin/transaksi/${kode}?ok=1${navSuffix(formData)}`);
}
