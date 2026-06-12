"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { buildKodeBooking, randomSuffix } from "@/lib/booking/kode";
import { hitungDp } from "@/lib/booking/hitung";

type Item = { packageId: string; qty: number };

export async function buatTransaksiAdmin(formData: FormData) {
  const me = await getCurrentProfile();
  if (me?.role !== "admin") throw new Error("forbidden");
  const admin = createAdminClient();
  const back = (m: string) => redirect(`/admin/transaksi/baru?error=${encodeURIComponent(m)}`);

  // 1. Item (JSON dari client).
  let items: Item[] = [];
  try { items = JSON.parse(String(formData.get("items") ?? "[]")); } catch { /* ignore */ }
  items = items.filter((it) => it.packageId && it.qty > 0);
  if (items.length === 0) back("Minimal 1 produk");

  // 2. Customer: existing atau buat baru.
  let customerId = String(formData.get("customerId") ?? "").trim();
  if (!customerId) {
    const nama = String(formData.get("new_nama") ?? "").trim();
    const no_wa = String(formData.get("new_wa") ?? "").trim();
    const email = String(formData.get("new_email") ?? "").trim();
    const alamat = String(formData.get("new_alamat") ?? "").trim();
    if (!nama || !email) back("Customer baru: nama & email wajib");
    const { data: created, error: cErr } = await admin.auth.admin.createUser({
      email, password: crypto.randomUUID(), email_confirm: true,
    });
    if (cErr || !created.user) {
      // Email mungkin sudah terdaftar -> pakai profil yang ada.
      const { data: ex } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
      if (!ex) back("Gagal buat customer: " + (cErr?.message ?? "unknown"));
      customerId = (ex!.id as string);
    } else {
      customerId = created.user.id;
    }
    await admin.from("profiles").update({ nama, no_wa, alamat, email }).eq("id", customerId);
  }

  // 3. Harga paket (snapshot) + paket primary.
  const ids = items.map((i) => i.packageId);
  const { data: pkgsData } = await admin.from("package").select("id, harga, dp_persen").in("id", ids);
  const pkgs = (pkgsData ?? []) as unknown as { id: string; harga: number; dp_persen: number }[];
  const pkgMap = new Map(pkgs.map((p) => [p.id, p]));
  if (pkgMap.size === 0) back("Paket tidak ditemukan");
  const primary = pkgMap.get(items[0].packageId);
  const total = items.reduce((sum, it) => sum + (pkgMap.get(it.packageId)?.harga ?? 0) * it.qty, 0);

  // 4. Jadwal + lokasi + ongkos.
  const tanggal = String(formData.get("tanggal") ?? "");
  const sesiId = String(formData.get("sesiId") ?? "");
  if (!tanggal || !sesiId) back("Tanggal & sesi wajib");
  const { data: sesiData } = await admin.from("sesi").select("jam_mulai").eq("id", sesiId).single();
  if (!sesiData) back("Sesi tidak ditemukan");
  const sesi = sesiData as unknown as { jam_mulai: string };

  const lokasi = String(formData.get("lokasi_sesi") ?? "studio");
  const zonaId = String(formData.get("zonaId") ?? "").trim();
  const alamatSesi = String(formData.get("alamat_sesi") ?? "").trim();
  let ongkos = Math.max(0, Number(formData.get("ongkos") ?? 0));
  if (lokasi === "home" && ongkos === 0 && zonaId) {
    const { data: z } = await admin.from("zona_ongkos").select("biaya").eq("id", zonaId).single();
    ongkos = (z?.biaya as number) ?? 0;
  }

  // 5. Anak.
  const anakNama = String(formData.get("anak_nama") ?? "").trim();
  const anakBb = Number(formData.get("anak_bb") ?? 0);
  const anakJk = String(formData.get("anak_jk") ?? "");
  if (!anakNama || !anakBb || (anakJk !== "L" && anakJk !== "P")) back("Data anak belum lengkap");

  // 6. Diskon, DP, status.
  const diskon = Math.max(0, Number(formData.get("diskon") ?? 0));
  const dpRaw = String(formData.get("dp_amount") ?? "").trim();
  const dp = dpRaw === "" ? hitungDp(total + ongkos - diskon, primary?.dp_persen ?? 30) : Math.max(0, Number(dpRaw));
  const status = String(formData.get("status") ?? "unpaid");
  const rawTahap = String(formData.get("status_pengerjaan") ?? "");
  const tahap = ["pilih_foto", "edit", "cetak", "pengiriman", "selesai"].includes(rawTahap) ? rawTahap : null;
  const statusBooking = status === "lunas" ? "completed" : status === "dp_paid" ? "confirmed" : "pending";

  // 7. Insert booking (primary package).
  const kode = buildKodeBooking(tanggal, randomSuffix());
  const { data: booking, error: bErr } = await admin.from("booking").insert({
    kode_booking: kode,
    package_id: items[0].packageId,
    sesi_id: sesiId,
    customer_profile_id: customerId,
    anak_nama: anakNama, anak_bb: anakBb, anak_jk: anakJk,
    lokasi_sesi: lokasi,
    zona_id: lokasi === "home" ? (zonaId || null) : null,
    alamat_sesi: lokasi === "home" ? alamatSesi : null,
    tanggal, jam_mulai: sesi.jam_mulai as string,
    status_booking: statusBooking,
    status_pengerjaan: tahap,
  }).select("id").single();
  if (bErr || !booking) back(bErr?.message ?? "Gagal simpan booking");

  // 8. Insert item.
  await admin.from("booking_item").insert(
    items.map((it) => ({ booking_id: booking!.id, package_id: it.packageId, qty: it.qty, harga: pkgMap.get(it.packageId)?.harga ?? 0 })),
  );

  // 9. Insert payment.
  const paid = status === "dp_paid" || status === "lunas";
  await admin.from("payment").insert({
    booking_id: booking!.id, total, ongkos, diskon, dp_amount: dp,
    status_bayar: status,
    dibayar_at: paid ? new Date().toISOString() : null,
    dicatat_oleh: paid ? me.id : null,
  });

  redirect(`/admin/transaksi/${kode}`);
}
