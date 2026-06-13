"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { getAnakByProfile, type AnakOpsi } from "@/lib/member/anak";

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
  const balik = `/admin/master/customer?profileId=${encodeURIComponent(id)}${q ? `&q=${encodeURIComponent(q)}` : ""}`;
  if (!id) redirect(`/admin/master/customer?error=${encodeURIComponent("Customer tidak valid")}`);

  const admin = createAdminClient();
  await admin
    .from("profiles")
    .update({
      nama: String(formData.get("nama") ?? "").trim() || null,
      no_wa: String(formData.get("no_wa") ?? "").trim() || null,
      email: String(formData.get("email") ?? "").trim() || null,
      alamat: String(formData.get("alamat") ?? "").trim() || null,
    })
    .eq("id", id);

  revalidatePath("/admin/master/customer");
  redirect(`${balik}&ok=${encodeURIComponent("Profil customer tersimpan")}`);
}
