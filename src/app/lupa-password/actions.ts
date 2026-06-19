"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function kirimResetPassword(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) redirect(`/lupa-password?error=${encodeURIComponent("Email wajib diisi")}`);

  const supabase = await createClient();
  // Memicu email recovery yang memuat KODE 6-digit ({{ .Token }} di template).
  await supabase.auth.resetPasswordForEmail(email);

  // Selalu arahkan ke halaman masukkan kode (anti email-enumeration — kalau email
  // tak terdaftar, kode tak akan datang & verifikasi akan gagal).
  redirect(`/reset-password?email=${encodeURIComponent(email)}`);
}
