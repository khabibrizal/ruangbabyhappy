import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Callback recovery/verifikasi Supabase (PKCE). Email reset password mengarah
 * ke sini dgn `?code=...`; tukar code -> sesi (set cookie), lalu redirect ke `next`.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next") ?? "/member";
  const next = nextParam.startsWith("/") ? nextParam : "/member";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, origin));
  }
  return NextResponse.redirect(
    new URL(`/lupa-password?error=${encodeURIComponent("Link tidak valid atau sudah kadaluarsa")}`, origin),
  );
}
