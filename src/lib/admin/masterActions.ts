"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import sharp from "sharp";

async function guardAdmin() {
  const me = await getCurrentProfile();
  if (me?.role !== "admin") throw new Error("forbidden");
  return createAdminClient();
}

/** Redirect balik ke halaman master dgn toast sukses (?ok) — feedback FlashToast. */
function okBack(path: string, pesan: string): never {
  redirect(`${path}?ok=${encodeURIComponent(pesan)}`);
}
/** Redirect balik ke halaman master dgn toast error (?error). */
function errBack(path: string, pesan: string): never {
  redirect(`${path}?error=${encodeURIComponent(pesan)}`);
}

// ---- Vendor ----
const P_VENDOR = "/admin/master/vendor";
export async function buatVendor(formData: FormData) {
  const admin = await guardAdmin();
  await admin.from("vendor").insert({
    nama: String(formData.get("nama") ?? "").trim(),
    slug: String(formData.get("slug") ?? "").trim(),
    tagline: String(formData.get("tagline") ?? "").trim() || null,
    ig: String(formData.get("ig") ?? "").trim() || null,
    alamat: String(formData.get("alamat") ?? "").trim() || null,
    butuh_anak: String(formData.get("butuh_anak")) === "on",
  });
  revalidatePath(P_VENDOR);
  okBack(P_VENDOR, "Vendor disimpan");
}
export async function updateVendor(formData: FormData) {
  const admin = await guardAdmin();
  await admin.from("vendor").update({
    nama: String(formData.get("nama") ?? "").trim(),
    slug: String(formData.get("slug") ?? "").trim(),
    tagline: String(formData.get("tagline") ?? "").trim() || null,
    ig: String(formData.get("ig") ?? "").trim() || null,
    alamat: String(formData.get("alamat") ?? "").trim() || null,
    butuh_anak: String(formData.get("butuh_anak")) === "on",
  }).eq("id", String(formData.get("id")));
  revalidatePath(P_VENDOR);
  okBack(P_VENDOR, "Vendor diperbarui");
}
export async function toggleVendor(formData: FormData) {
  const admin = await guardAdmin();
  const aktif = String(formData.get("aktif")) !== "true";
  await admin.from("vendor").update({ is_active: aktif }).eq("id", String(formData.get("id")));
  revalidatePath(P_VENDOR);
  okBack(P_VENDOR, aktif ? "Vendor diaktifkan" : "Vendor dinonaktifkan");
}

// ---- Layanan ----
const P_LAYANAN = "/admin/master/layanan";
export async function buatLayanan(formData: FormData) {
  const admin = await guardAdmin();
  await admin.from("layanan").insert({
    nama: String(formData.get("nama") ?? "").trim(),
    admin_wa: String(formData.get("admin_wa") ?? "").trim(),
    bank: String(formData.get("bank") ?? "").trim() || null,
    no_rek: String(formData.get("no_rek") ?? "").trim() || null,
    atas_nama: String(formData.get("atas_nama") ?? "").trim() || null,
    urutan: Number(formData.get("urutan") ?? 0),
    vendor_id: String(formData.get("vendor_id") ?? "").trim() || null,
  });
  revalidatePath(P_LAYANAN);
  okBack(P_LAYANAN, "Layanan disimpan");
}
export async function updateLayanan(formData: FormData) {
  const admin = await guardAdmin();
  await admin.from("layanan").update({
    nama: String(formData.get("nama") ?? "").trim(),
    admin_wa: String(formData.get("admin_wa") ?? "").trim(),
    bank: String(formData.get("bank") ?? "").trim() || null,
    no_rek: String(formData.get("no_rek") ?? "").trim() || null,
    atas_nama: String(formData.get("atas_nama") ?? "").trim() || null,
    urutan: Number(formData.get("urutan") ?? 0),
    vendor_id: String(formData.get("vendor_id") ?? "").trim() || null,
  }).eq("id", String(formData.get("id")));
  revalidatePath(P_LAYANAN);
  okBack(P_LAYANAN, "Layanan diperbarui");
}
export async function toggleLayanan(formData: FormData) {
  const admin = await guardAdmin();
  const aktif = String(formData.get("aktif")) !== "true";
  await admin.from("layanan").update({ is_active: aktif }).eq("id", String(formData.get("id")));
  revalidatePath(P_LAYANAN);
  okBack(P_LAYANAN, aktif ? "Layanan diaktifkan" : "Layanan dinonaktifkan");
}

// ---- Paket ----
const P_PAKET = "/admin/master/paket";
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
  revalidatePath(P_PAKET);
  okBack(P_PAKET, "Paket disimpan");
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
  revalidatePath(P_PAKET);
  okBack(P_PAKET, "Paket diperbarui");
}
export async function togglePaket(formData: FormData) {
  const admin = await guardAdmin();
  const aktif = String(formData.get("aktif")) !== "true";
  await admin.from("package").update({ is_active: aktif }).eq("id", String(formData.get("id")));
  revalidatePath(P_PAKET);
  okBack(P_PAKET, aktif ? "Paket diaktifkan" : "Paket dinonaktifkan");
}

// ---- Sesi ----
const P_SESI = "/admin/master/sesi";
export async function buatSesi(formData: FormData) {
  const admin = await guardAdmin();
  await admin.from("sesi").insert({
    nama: String(formData.get("nama") ?? "").trim(),
    jam_mulai: String(formData.get("jam_mulai") ?? "09:00"),
    urutan: Number(formData.get("urutan") ?? 0),
  });
  revalidatePath(P_SESI);
  okBack(P_SESI, "Sesi disimpan");
}
export async function updateSesi(formData: FormData) {
  const admin = await guardAdmin();
  await admin.from("sesi").update({
    nama: String(formData.get("nama") ?? "").trim(),
    jam_mulai: String(formData.get("jam_mulai") ?? "09:00"),
    urutan: Number(formData.get("urutan") ?? 0),
  }).eq("id", String(formData.get("id")));
  revalidatePath(P_SESI);
  okBack(P_SESI, "Sesi diperbarui");
}
export async function toggleSesi(formData: FormData) {
  const admin = await guardAdmin();
  const aktif = String(formData.get("aktif")) !== "true";
  await admin.from("sesi").update({ is_active: aktif }).eq("id", String(formData.get("id")));
  revalidatePath(P_SESI);
  okBack(P_SESI, aktif ? "Sesi diaktifkan" : "Sesi dinonaktifkan");
}

// ---- Zona ongkos ----
const P_ZONA = "/admin/master/zona";
export async function buatZona(formData: FormData) {
  const admin = await guardAdmin();
  await admin.from("zona_ongkos").insert({
    nama: String(formData.get("nama") ?? "").trim(),
    keterangan: String(formData.get("keterangan") ?? "").trim() || null,
    biaya: Number(formData.get("biaya") ?? 0),
    urutan: Number(formData.get("urutan") ?? 0),
  });
  revalidatePath(P_ZONA);
  okBack(P_ZONA, "Zona disimpan");
}
export async function updateZona(formData: FormData) {
  const admin = await guardAdmin();
  await admin.from("zona_ongkos").update({
    nama: String(formData.get("nama") ?? "").trim(),
    keterangan: String(formData.get("keterangan") ?? "").trim() || null,
    biaya: Number(formData.get("biaya") ?? 0),
    urutan: Number(formData.get("urutan") ?? 0),
  }).eq("id", String(formData.get("id")));
  revalidatePath(P_ZONA);
  okBack(P_ZONA, "Zona diperbarui");
}
export async function toggleZona(formData: FormData) {
  const admin = await guardAdmin();
  const aktif = String(formData.get("aktif")) !== "true";
  await admin.from("zona_ongkos").update({ is_active: aktif }).eq("id", String(formData.get("id")));
  revalidatePath(P_ZONA);
  okBack(P_ZONA, aktif ? "Zona diaktifkan" : "Zona dinonaktifkan");
}

// ---- Blackout (hard delete; tak direferensi FK) ----
const P_BLACKOUT = "/admin/master/blackout";
export async function buatBlackout(formData: FormData) {
  const admin = await guardAdmin();
  await admin.from("blackout_date").insert({
    tanggal: String(formData.get("tanggal") ?? ""),
    keterangan: String(formData.get("keterangan") ?? "").trim() || null,
  });
  revalidatePath(P_BLACKOUT);
  okBack(P_BLACKOUT, "Tanggal blackout ditambah");
}
export async function hapusBlackout(formData: FormData) {
  const admin = await guardAdmin();
  await admin.from("blackout_date").delete().eq("id", String(formData.get("id")));
  revalidatePath(P_BLACKOUT);
  okBack(P_BLACKOUT, "Tanggal blackout dihapus");
}

// ---- Galeri ----
const P_GALERI = "/admin/master/galeri";
export async function uploadGaleri(formData: FormData) {
  const admin = await guardAdmin();
  const file = formData.get("gambar");
  if (!(file instanceof File) || file.size === 0) errBack(P_GALERI, "Gambar wajib diupload");
  const f = file as File;
  if (!f.type.startsWith("image/")) errBack(P_GALERI, "File harus gambar");
  if (f.size > 25_000_000) errBack(P_GALERI, "Ukuran maksimal 25MB");

  const masuk = Buffer.from(await f.arrayBuffer());
  const webp = await sharp(masuk)
    .rotate()
    .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();

  const path = `g-${crypto.randomUUID()}.webp`;
  const { error: upErr } = await admin.storage.from("galeri").upload(path, webp, { contentType: "image/webp", upsert: true });
  if (upErr) errBack(P_GALERI, "Gagal upload: " + upErr.message);

  const url = admin.storage.from("galeri").getPublicUrl(path).data.publicUrl;
  await admin.from("gallery").insert({ url });
  revalidatePath(P_GALERI);
  revalidatePath("/");
  okBack(P_GALERI, "Foto diunggah");
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
  revalidatePath(P_GALERI);
  revalidatePath("/");
  okBack(P_GALERI, "Foto dihapus");
}
