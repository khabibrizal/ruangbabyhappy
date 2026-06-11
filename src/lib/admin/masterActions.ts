"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import sharp from "sharp";

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

// ---- Galeri ----
export async function uploadGaleri(formData: FormData) {
  const admin = await guardAdmin();
  const file = formData.get("gambar");
  if (!(file instanceof File) || file.size === 0) throw new Error("Gambar wajib diupload");
  if (!file.type.startsWith("image/")) throw new Error("File harus gambar");
  if (file.size > 25_000_000) throw new Error("Ukuran maksimal 25MB");

  const masuk = Buffer.from(await file.arrayBuffer());
  const webp = await sharp(masuk)
    .rotate()
    .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();

  const path = `g-${crypto.randomUUID()}.webp`;
  const { error: upErr } = await admin.storage.from("galeri").upload(path, webp, { contentType: "image/webp", upsert: true });
  if (upErr) throw new Error("Gagal upload: " + upErr.message);

  const url = admin.storage.from("galeri").getPublicUrl(path).data.publicUrl;
  await admin.from("gallery").insert({ url });
  revalidatePath("/admin/master/galeri");
  revalidatePath("/");
}

export async function hapusGaleri(formData: FormData) {
  const admin = await guardAdmin();
  const id = String(formData.get("id"));
  const { data: row } = await admin.from("gallery").select("url").eq("id", id).single();
  const url = (row?.url as string) ?? "";
  const marker = "/storage/v1/object/public/galeri/";
  const i = url.indexOf(marker);
  if (i >= 0) await admin.storage.from("galeri").remove([url.slice(i + marker.length)]);
  await admin.from("gallery").delete().eq("id", id);
  revalidatePath("/admin/master/galeri");
  revalidatePath("/");
}
