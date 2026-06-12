"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";

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
