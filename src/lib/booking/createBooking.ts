"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { getSesiTersedia } from "./sesiAvailability";
import { buildKodeBooking, randomSuffix } from "./kode";
import { hitungDiskon, hitungTagihan, hitungDp } from "./hitung";

function extDari(type: string): string {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "jpg";
}

export async function buatBooking(formData: FormData) {
  const packageId = String(formData.get("packageId") ?? "");
  const back = (msg: string) => redirect(`/paket/${packageId}?error=${encodeURIComponent(msg)}`);

  // 0. Wajib login (member).
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const tanggal = String(formData.get("tanggal") ?? "");
  const sesiId = String(formData.get("sesiId") ?? "");
  const anakNama = String(formData.get("anak_nama") ?? "").trim();
  const anakBb = Number(formData.get("anak_bb") ?? 0);
  const anakJk = String(formData.get("anak_jk") ?? "");
  const lokasi = String(formData.get("lokasi_sesi") ?? "home");
  const zonaId = String(formData.get("zonaId") ?? "");
  const alamatSesi = String(formData.get("alamat_sesi") ?? "").trim();

  if (!packageId || !tanggal || !sesiId) back("Data belum lengkap");
  if (lokasi === "home" && (!zonaId || !alamatSesi)) back("Zona & alamat home service wajib diisi");

  // 1. Bukti TF wajib (gambar, <=5MB).
  const file = formData.get("bukti");
  if (!(file instanceof File) || file.size === 0) back("Bukti transfer wajib diupload");
  const bukti = file as File;
  if (!bukti.type.startsWith("image/")) back("Bukti harus berupa gambar");
  if (bukti.size > 5_000_000) back("Ukuran bukti maksimal 5MB");

  const admin = createAdminClient();

  // 2. Validasi sesi ULANG (kapasitas per layanan).
  const sesiTersedia = await getSesiTersedia(packageId, tanggal);
  const sesiDipilih = sesiTersedia.find((s) => s.id === sesiId);
  if (!sesiDipilih) back("Sesi sudah tidak tersedia");

  // 3. Paket -> harga, dp_persen, diskon_returning, + vendor.butuh_anak (otoritatif server).
  const { data: paketData } = await admin
    .from("package")
    .select("harga, dp_persen, diskon_returning, layanan:layanan_id(vendor:vendor_id(butuh_anak))")
    .eq("id", packageId)
    .single();
  if (!paketData) back("Paket tidak ditemukan");
  const paket = paketData as unknown as {
    harga: number;
    dp_persen: number;
    diskon_returning: number;
    layanan: { vendor: { butuh_anak: boolean } | null } | null;
  };

  // 3b. Butuh data anak? (otoritatif dari vendor; default true bila tak terset).
  const butuhAnak = paket.layanan?.vendor?.butuh_anak ?? true;
  if (butuhAnak && (!anakNama || !anakBb || (anakJk !== "L" && anakJk !== "P"))) {
    back("Data anak belum lengkap");
  }

  // 4. Ongkos dari zona (0 bila studio).
  let ongkos = 0;
  if (lokasi === "home") {
    const { data: zona } = await admin.from("zona_ongkos").select("biaya").eq("id", zonaId).single();
    ongkos = (zona?.biaya as number) ?? 0;
  }

  // 5. Returning? (member punya >=1 booking lunas).
  const { count } = await admin
    .from("booking")
    .select("id, payment!inner(status_bayar)", { count: "exact", head: true })
    .eq("customer_profile_id", profile!.id)
    .eq("payment.status_bayar", "lunas");
  const returning = (count ?? 0) > 0;

  const diskon = hitungDiskon({ returning, diskonReturning: paket!.diskon_returning as number });
  const total = paket!.harga as number;
  const tagihan = hitungTagihan({ harga: total, ongkos, diskon });
  const dp = hitungDp(tagihan, paket!.dp_persen as number);

  const kode = buildKodeBooking(tanggal, randomSuffix());

  // 6. Upload bukti (service-role).
  const path = `bukti/${kode}.${extDari(bukti.type)}`;
  const { error: upErr } = await admin.storage
    .from("bukti-tf")
    .upload(path, await bukti.arrayBuffer(), { contentType: bukti.type, upsert: true });
  if (upErr) back("Gagal upload bukti: " + upErr.message);

  // 7. Insert booking (pending) milik member.
  const { data: booking, error } = await admin
    .from("booking")
    .insert({
      kode_booking: kode,
      package_id: packageId,
      sesi_id: sesiId,
      customer_profile_id: profile!.id,
      anak_nama: butuhAnak ? anakNama : null,
      anak_bb: butuhAnak ? anakBb : null,
      anak_jk: butuhAnak ? anakJk : null,
      lokasi_sesi: lokasi,
      zona_id: lokasi === "home" ? zonaId : null,
      alamat_sesi: lokasi === "home" ? alamatSesi : null,
      tanggal,
      jam_mulai: sesiDipilih!.jam_mulai,
      status_booking: "pending",
    })
    .select("id")
    .single();
  if (error || !booking) back(error?.message ?? "Gagal booking");

  // 8. Insert payment (unpaid + total/ongkos/diskon/dp + bukti).
  await admin.from("payment").insert({
    booking_id: booking!.id,
    total,
    ongkos,
    diskon,
    dp_amount: dp,
    status_bayar: "unpaid",
    bukti_url: path,
  });

  redirect(`/booking/${kode}`);
}
