"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/seo/config";

export async function kirimResetPassword(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) redirect(`/lupa-password?error=${encodeURIComponent("Email wajib diisi")}`);

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${SITE_URL}/auth/callback?next=/reset-password`,
  });

  // Pesan generik (anti email-enumeration) — sama saja email terdaftar atau tidak.
  redirect(
    `/lupa-password?ok=${encodeURIComponent("Jika email terdaftar, link reset password telah dikirim. Cek inbox & folder spam.")}`,
  );
}
