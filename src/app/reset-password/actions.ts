"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { validasiPassword } from "@/lib/auth/password";

export async function setPasswordBaru(formData: FormData) {
  const baru = String(formData.get("baru") ?? "");
  const konfirmasi = String(formData.get("konfirmasi") ?? "");
  const back = (m: string) => redirect(`/reset-password?error=${encodeURIComponent(m)}`);

  const v = validasiPassword(baru, konfirmasi);
  if (v) back(v);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/lupa-password?error=${encodeURIComponent("Sesi reset tidak ditemukan, minta link lagi")}`);

  const { error } = await supabase.auth.updateUser({ password: baru });
  if (error) back(error.message);

  redirect(`/member?ok=${encodeURIComponent("Password berhasil diatur ulang")}`);
}
