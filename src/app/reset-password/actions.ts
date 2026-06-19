"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { validasiPassword } from "@/lib/auth/password";

export async function setPasswordBaru(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const kode = String(formData.get("kode") ?? "").trim();
  const baru = String(formData.get("baru") ?? "");
  const konfirmasi = String(formData.get("konfirmasi") ?? "");
  const back = (m: string) =>
    redirect(`/reset-password?email=${encodeURIComponent(email)}&error=${encodeURIComponent(m)}`);

  if (!email || !kode) back("Email & kode wajib diisi");
  const v = validasiPassword(baru, konfirmasi);
  if (v) back(v);

  const supabase = await createClient();
  // Verifikasi kode recovery (membuat sesi bila valid).
  const { error: vErr } = await supabase.auth.verifyOtp({ email, token: kode, type: "recovery" });
  if (vErr) back("Kode salah atau kedaluwarsa. Minta kode baru.");

  const { error } = await supabase.auth.updateUser({ password: baru });
  if (error) back(error.message);

  redirect(`/member?ok=${encodeURIComponent("Password berhasil diatur ulang")}`);
}
