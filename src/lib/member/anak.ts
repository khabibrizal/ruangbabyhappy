import { createAdminClient } from "@/lib/supabase/admin";

export type AnakOpsi = { nama: string; bb: number; jk: string };

/**
 * Daftar anak unik milik sebuah member, diturunkan dari booking-booking sebelumnya.
 * Dedup by nama (case-insensitive); ambil BB/JK dari booking terbaru. Tanpa tabel baru.
 */
export async function getAnakByProfile(profileId: string): Promise<AnakOpsi[]> {
  if (!profileId) return [];
  const admin = createAdminClient();
  const { data } = await admin
    .from("booking")
    .select("anak_nama, anak_bb, anak_jk, created_at")
    .eq("customer_profile_id", profileId)
    .order("created_at", { ascending: false });
  const rows = (data ?? []) as unknown as { anak_nama: string; anak_bb: number; anak_jk: string }[];
  const seen = new Map<string, AnakOpsi>();
  for (const r of rows) {
    const key = (r.anak_nama ?? "").trim().toLowerCase();
    if (key && !seen.has(key)) seen.set(key, { nama: r.anak_nama, bb: r.anak_bb, jk: r.anak_jk });
  }
  return [...seen.values()];
}
