import { createClient } from "@supabase/supabase-js";

/** HANYA dipakai di server (Server Actions / route handlers). Jangan import di komponen client. */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}
