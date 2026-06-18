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

  // Buat user langsung TERKONFIRMASI (email_confirm) lewat service-role, agar tak
  // bergantung pada setting "Confirm email" dashboard — kalau aktif, signUp biasa
  // bikin user tanpa sesi & login berikutnya gagal "Email not confirmed".
  const admin = createAdminClient();
  const { data: created, error: cErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (cErr || !created.user) {
    redirect(`/register?error=${encodeURIComponent(cErr?.message ?? "Gagal daftar")}`);
  }

  // Trigger sudah membuat baris profil; lengkapi datanya.
  await admin.from("profiles").update({ nama, no_wa, alamat, email }).eq("id", created.user!.id);

  // Langsung buat sesi -> user otomatis login setelah daftar.
  const supabase = await createClient();
  const { error: sErr } = await supabase.auth.signInWithPassword({ email, password });
  if (sErr) {
    // Akun sudah dibuat & terkonfirmasi; bila sesi gagal dibuat, arahkan ke login.
    redirect(`/login?error=${encodeURIComponent("Akun berhasil dibuat, silakan login")}`);
  }

  redirect("/member");
}
