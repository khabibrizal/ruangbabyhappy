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
  const dpRaw = String(formData.get("dp_amount") ?? "").trim();
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

  // DP: manual bila diisi admin; kosong = hitung otomatis (paket+ongkos−diskon)×dp_persen.
  const dp = dpRaw === "" ? hitungDp(total + ongkos - diskon, pkg?.dp_persen ?? 30) : Math.max(0, Number(dpRaw));

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
  redirect(`/admin/transaksi/${kode}?ok=${encodeURIComponent("Pembayaran tersimpan")}${navSuffix(formData)}`);
}

/** Atur status pengerjaan foto (boleh dikosongkan -> belum mulai / NULL). */
export async function updateStatusPengerjaan(formData: FormData) {
  await guardAdmin();
  const bookingId = String(formData.get("bookingId") ?? "");
  const kode = String(formData.get("kode") ?? "");
  const raw = String(formData.get("status_pengerjaan") ?? "");
  const nilai = (TAHAP_PENGERJAAN as readonly string[]).includes(raw) ? raw : null;
  const drive_url = String(formData.get("drive_url") ?? "").trim() || null;
  const admin = createAdminClient();
  await admin.from("booking").update({ status_pengerjaan: nilai, drive_url }).eq("id", bookingId);
  revalidatePath(`/admin/transaksi/${kode}`);
  redirect(`/admin/transaksi/${kode}?ok=${encodeURIComponent("Status pengerjaan tersimpan")}${navSuffix(formData)}`);
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
  redirect(`/admin/transaksi/${kode}?ok=${encodeURIComponent("Jadwal diperbarui")}${navSuffix(formData)}`);
}

/**
 * Sumber kebenaran total header: payment.total = Σ(booking_item.harga × qty).
 * Dipanggil tiap kali item ditambah/dihapus. ongkos/diskon/dp tidak diubah
 * (admin bisa re-save form Pembayaran utk hitung ulang DP otomatis).
 */
async function recomputeHeaderTotal(admin: ReturnType<typeof createAdminClient>, bookingId: string, paymentId: string) {
  const { data: items } = await admin.from("booking_item").select("qty, harga").eq("booking_id", bookingId);
  const total = (items ?? []).reduce((s, it) => s + Number(it.harga) * Number(it.qty), 0);
  await admin.from("payment").update({ total }).eq("id", paymentId);
}

/** Tambah item paket ke transaksi yang sudah ada; total header dihitung ulang. */
export async function tambahItemTransaksi(formData: FormData) {
  await guardAdmin();
  const bookingId = String(formData.get("bookingId") ?? "");
  const paymentId = String(formData.get("paymentId") ?? "");
  const kode = String(formData.get("kode") ?? "");
  const packageId = String(formData.get("packageId") ?? "").trim();
  const qty = Math.max(1, Math.floor(Number(formData.get("qty") ?? 1)));
  const admin = createAdminClient();

  if (!packageId) redirect(`/admin/transaksi/${kode}?error=Paket%20wajib%20dipilih${navSuffix(formData)}`);
  const { data: pkg } = await admin.from("package").select("harga, is_active").eq("id", packageId).single();
  if (!pkg || !pkg.is_active) {
    redirect(`/admin/transaksi/${kode}?error=Paket%20tidak%20tersedia${navSuffix(formData)}`);
  }

  await admin.from("booking_item").insert({ booking_id: bookingId, package_id: packageId, qty, harga: pkg!.harga });
  await recomputeHeaderTotal(admin, bookingId, paymentId);

  revalidatePath(`/admin/transaksi/${kode}`);
  revalidatePath("/admin/transaksi");
  redirect(`/admin/transaksi/${kode}?ok=${encodeURIComponent("Item ditambah")}${navSuffix(formData)}`);
}

/** Hapus item paket dari transaksi; total header dihitung ulang. Sisakan minimal 1 item. */
export async function hapusItemTransaksi(formData: FormData) {
  await guardAdmin();
  const itemId = String(formData.get("itemId") ?? "");
  const bookingId = String(formData.get("bookingId") ?? "");
  const paymentId = String(formData.get("paymentId") ?? "");
  const kode = String(formData.get("kode") ?? "");
  const admin = createAdminClient();

  const { count } = await admin
    .from("booking_item")
    .select("id", { count: "exact", head: true })
    .eq("booking_id", bookingId);
  if ((count ?? 0) <= 1) {
    redirect(`/admin/transaksi/${kode}?error=Minimal%201%20item%20harus%20tersisa${navSuffix(formData)}`);
  }

  await admin.from("booking_item").delete().eq("id", itemId).eq("booking_id", bookingId);
  await recomputeHeaderTotal(admin, bookingId, paymentId);

  revalidatePath(`/admin/transaksi/${kode}`);
  revalidatePath("/admin/transaksi");
  redirect(`/admin/transaksi/${kode}?ok=${encodeURIComponent("Item dihapus")}${navSuffix(formData)}`);
}
