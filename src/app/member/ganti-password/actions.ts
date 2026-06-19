"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { validasiPassword } from "@/lib/auth/password";

export async function gantiPassword(formData: FormData) {
  const lama = String(formData.get("lama") ?? "");
  const baru = String(formData.get("baru") ?? "");
  const konfirmasi = String(formData.get("konfirmasi") ?? "");
  const back = (m: string) => redirect(`/member/ganti-password?error=${encodeURIComponent(m)}`);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) redirect("/login?next=/member/ganti-password");

  const v = validasiPassword(baru, konfirmasi);
  if (v) back(v);

  // Verifikasi password lama dulu (cegah ganti tanpa tahu password saat ini).
  const { error: errLama } = await supabase.auth.signInWithPassword({ email: user!.email, password: lama });
  if (errLama) back("Password lama salah");

  const { error } = await supabase.auth.updateUser({ password: baru });
  if (error) back(error.message);

  redirect(`/member?ok=${encodeURIComponent("Password berhasil diganti")}`);
}
