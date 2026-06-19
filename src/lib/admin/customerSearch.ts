"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { getAnakByProfile, type AnakOpsi } from "@/lib/member/anak";
import { MIN_PASSWORD } from "@/lib/auth/password";

export type CustomerHit = { id: string; nama: string | null; no_wa: string | null; email: string | null; alamat: string | null };

/** Cari customer (member) by no WA atau nama. Dipakai form admin. */
export async function cariCustomer(query: string): Promise<CustomerHit[]> {
  const me = await getCurrentProfile();
  if (me?.role !== "admin") return [];
  const q = query.trim();
  if (q.length < 2) return [];
  const admin = createAdminClient();
  const like = `%${q}%`;
  const { data } = await admin
    .from("profiles")
    .select("id, nama, no_wa, email, alamat")
    .or(`nama.ilike.${like},no_wa.ilike.${like}`)
    .limit(10);
  return (data as CustomerHit[]) ?? [];
}

/** Daftar anak milik customer terpilih (utk dipilih ulang di form admin). */
export async function anakCustomer(profileId: string): Promise<AnakOpsi[]> {
  const me = await getCurrentProfile();
  if (me?.role !== "admin") return [];
  return getAnakByProfile(profileId);
}

/** Simpan profil customer (admin). Dipakai halaman Master Customer. */
export async function simpanProfilCustomer(formData: FormData) {
  const me = await getCurrentProfile();
  if (me?.role !== "admin") throw new Error("forbidden");
  const id = String(formData.get("id") ?? "").trim();
  const q = String(formData.get("q") ?? "");
  const page = String(formData.get("page") ?? "");
  if (!id) redirect(`/admin/master/customer?error=${encodeURIComponent("Customer tidak valid")}`);
  const ctx = new URLSearchParams();
  ctx.set("ok", "Profil customer tersimpan");
  if (q) ctx.set("q", q);
  if (page) ctx.set("page", page);
  const balik = `/admin/master/customer/${id}?${ctx}`;

  const admin = createAdminClient();
  await admin
    .from("profiles")
    .update({
      nama: String(formData.get("nama") ?? "").trim() || null,
      no_wa: String(formData.get("no_wa") ?? "").trim() || null,
      email: String(formData.get("email") ?? "").trim() || null,
      alamat: String(formData.get("alamat") ?? "").trim() || null,
      ig: String(formData.get("ig") ?? "").trim() || null,
    })
    .eq("id", id);

  revalidatePath("/admin/master/customer");
  redirect(balik);
}

/** Reset password customer oleh admin (cadangan bila email reset bermasalah). */
export async function resetPasswordCustomer(formData: FormData) {
  const me = await getCurrentProfile();
  if (me?.role !== "admin") throw new Error("forbidden");
  const id = String(formData.get("id") ?? "").trim();
  const q = String(formData.get("q") ?? "");
  const page = String(formData.get("page") ?? "");
  const baru = String(formData.get("password") ?? "");
  if (!id) redirect(`/admin/master/customer?error=${encodeURIComponent("Customer tidak valid")}`);

  const balik = (key: "ok" | "error", msg: string): never => {
    const p = new URLSearchParams();
    p.set(key, msg);
    if (q) p.set("q", q);
    if (page) p.set("page", page);
    redirect(`/admin/master/customer/${id}?${p}`);
  };

  if (baru.length < MIN_PASSWORD) balik("error", `Password minimal ${MIN_PASSWORD} karakter`);

  const admin = createAdminClient();
  // id profil = id auth user utk member terdaftar. Customer legacy (tanpa akun
  // login) tak punya auth user -> updateUserById gagal "user not found".
  const { error } = await admin.auth.admin.updateUserById(id, { password: baru });
  if (error) balik("error", "Gagal reset: customer ini belum punya akun login (minta daftar dulu).");

  balik("ok", "Password customer berhasil direset");
}
