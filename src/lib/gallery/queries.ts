import { createClient } from "@/lib/supabase/server";

export type GaleriRow = { id: string; url: string };

/** Daftar foto galeri (RLS public read), urut waktu unggah. */
export async function getGaleri(): Promise<GaleriRow[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("gallery").select("id, url").order("created_at", { ascending: true });
  return (data as GaleriRow[]) ?? [];
}
