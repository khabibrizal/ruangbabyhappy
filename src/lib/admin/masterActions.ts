"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";

async function guardAdmin() {
  const me = await getCurrentProfile();
  if (me?.role !== "admin") throw new Error("forbidden");
  return createAdminClient();
}

// ---- Layanan ----
export async function buatLayanan(formData: FormData) {
  const admin = await guardAdmin();
  await admin.from("layanan").insert({
    nama: String(formData.get("nama") ?? "").trim(),
    admin_wa: String(formData.get("admin_wa") ?? "").trim(),
    urutan: Number(formData.get("urutan") ?? 0),
  });
  revalidatePath("/admin/master/layanan");
}
export async function updateLayanan(formData: FormData) {
  const admin = await guardAdmin();
  await admin.from("layanan").update({
    nama: String(formData.get("nama") ?? "").trim(),
    admin_wa: String(formData.get("admin_wa") ?? "").trim(),
    urutan: Number(formData.get("urutan") ?? 0),
  }).eq("id", String(formData.get("id")));
  revalidatePath("/admin/master/layanan");
}
export async function toggleLayanan(formData: FormData) {
  const admin = await guardAdmin();
  await admin.from("layanan")
    .update({ is_active: String(formData.get("aktif")) !== "true" })
    .eq("id", String(formData.get("id")));
  revalidatePath("/admin/master/layanan");
}

// ---- Paket ----
export async function buatPaket(formData: FormData) {
  const admin = await guardAdmin();
  await admin.from("package").insert({
    layanan_id: String(formData.get("layanan_id")),
    nama: String(formData.get("nama") ?? "").trim(),
    deskripsi: String(formData.get("deskripsi") ?? "").trim() || null,
    harga: Number(formData.get("harga") ?? 0),
    diskon_returning: Number(formData.get("diskon_returning") ?? 0),
    dp_persen: Number(formData.get("dp_persen") ?? 30),
    durasi_menit: Number(formData.get("durasi_menit") ?? 0),
  });
  revalidatePath("/admin/master/paket");
}
export async function updatePaket(formData: FormData) {
  const admin = await guardAdmin();
  await admin.from("package").update({
    layanan_id: String(formData.get("layanan_id")),
    nama: String(formData.get("nama") ?? "").trim(),
    deskripsi: String(formData.get("deskripsi") ?? "").trim() || null,
    harga: Number(formData.get("harga") ?? 0),
    diskon_returning: Number(formData.get("diskon_returning") ?? 0),
    dp_persen: Number(formData.get("dp_persen") ?? 30),
    durasi_menit: Number(formData.get("durasi_menit") ?? 0),
  }).eq("id", String(formData.get("id")));
  revalidatePath("/admin/master/paket");
}
export async function togglePaket(formData: FormData) {
  const admin = await guardAdmin();
  await admin.from("package")
    .update({ is_active: String(formData.get("aktif")) !== "true" })
    .eq("id", String(formData.get("id")));
  revalidatePath("/admin/master/paket");
}

// ---- Sesi ----
export async function buatSesi(formData: FormData) {
  const admin = await guardAdmin();
  await admin.from("sesi").insert({
    nama: String(formData.get("nama") ?? "").trim(),
    jam_mulai: String(formData.get("jam_mulai") ?? "09:00"),
    urutan: Number(formData.get("urutan") ?? 0),
  });
  revalidatePath("/admin/master/sesi");
}
export async function updateSesi(formData: FormData) {
  const admin = await guardAdmin();
  await admin.from("sesi").update({
    nama: String(formData.get("nama") ?? "").trim(),
    jam_mulai: String(formData.get("jam_mulai") ?? "09:00"),
    urutan: Number(formData.get("urutan") ?? 0),
  }).eq("id", String(formData.get("id")));
  revalidatePath("/admin/master/sesi");
}
export async function toggleSesi(formData: FormData) {
  const admin = await guardAdmin();
  await admin.from("sesi")
    .update({ is_active: String(formData.get("aktif")) !== "true" })
    .eq("id", String(formData.get("id")));
  revalidatePath("/admin/master/sesi");
}

// ---- Zona ongkos ----
export async function buatZona(formData: FormData) {
  const admin = await guardAdmin();
  await admin.from("zona_ongkos").insert({
    nama: String(formData.get("nama") ?? "").trim(),
    keterangan: String(formData.get("keterangan") ?? "").trim() || null,
    biaya: Number(formData.get("biaya") ?? 0),
    urutan: Number(formData.get("urutan") ?? 0),
  });
  revalidatePath("/admin/master/zona");
}
export async function updateZona(formData: FormData) {
  const admin = await guardAdmin();
  await admin.from("zona_ongkos").update({
    nama: String(formData.get("nama") ?? "").trim(),
    keterangan: String(formData.get("keterangan") ?? "").trim() || null,
    biaya: Number(formData.get("biaya") ?? 0),
    urutan: Number(formData.get("urutan") ?? 0),
  }).eq("id", String(formData.get("id")));
  revalidatePath("/admin/master/zona");
}
export async function toggleZona(formData: FormData) {
  const admin = await guardAdmin();
  await admin.from("zona_ongkos")
    .update({ is_active: String(formData.get("aktif")) !== "true" })
    .eq("id", String(formData.get("id")));
  revalidatePath("/admin/master/zona");
}

// ---- Blackout (hard delete; tak direferensi FK) ----
export async function buatBlackout(formData: FormData) {
  const admin = await guardAdmin();
  await admin.from("blackout_date").insert({
    tanggal: String(formData.get("tanggal") ?? ""),
    keterangan: String(formData.get("keterangan") ?? "").trim() || null,
  });
  revalidatePath("/admin/master/blackout");
}
export async function hapusBlackout(formData: FormData) {
  const admin = await guardAdmin();
  await admin.from("blackout_date").delete().eq("id", String(formData.get("id")));
  revalidatePath("/admin/master/blackout");
}
