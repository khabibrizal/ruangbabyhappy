"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function register(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const nama = String(formData.get("nama") ?? "").trim();
  const no_wa = String(formData.get("no_wa") ?? "").trim();
  const alamat = String(formData.get("alamat") ?? "").trim();

  if (!email || !password || !nama) {
    redirect("/register?error=Data%20wajib%20belum%20lengkap");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error || !data.user) {
    redirect(`/register?error=${encodeURIComponent(error?.message ?? "Gagal daftar")}`);
  }

  // Trigger sudah membuat baris profil; lengkapi datanya (service-role agar pasti tertulis).
  const admin = createAdminClient();
  await admin.from("profiles").update({ nama, no_wa, alamat, email }).eq("id", data.user!.id);

  redirect("/member");
}
