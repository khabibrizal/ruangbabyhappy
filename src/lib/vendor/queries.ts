import { createClient } from "@/lib/supabase/server";
import type { PaketCard, LayananDenganPaket } from "@/lib/catalog/queries";

const PAKET_COLS =
  "id, nama, deskripsi, harga, dp_persen, diskon_returning, durasi_menit, foto_url, is_active, layanan_id";

export type VendorInfo = {
  id: string;
  slug: string;
  nama: string;
  tagline: string | null;
  ig: string | null;
  alamat: string | null;
  butuh_anak: boolean;
};

export type VendorDenganPaket = {
  vendor: VendorInfo;
  layanan: LayananDenganPaket[];
};

/** Vendor + layanan aktif vendor itu beserta paket aktifnya (untuk halaman /v/[slug]). */
export async function getVendorBySlug(slug: string): Promise<VendorDenganPaket | null> {
  const supabase = await createClient();

  const { data: v } = await supabase
    .from("vendor")
    .select("id, slug, nama, tagline, ig, alamat, butuh_anak")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  if (!v) return null;
  const vendor = v as unknown as VendorInfo;

  const { data: layanan } = await supabase
    .from("layanan")
    .select("id, nama, urutan")
    .eq("is_active", true)
    .eq("vendor_id", vendor.id)
    .order("urutan");

  const list = (layanan as { id: string; nama: string; urutan: number }[]) ?? [];
  if (list.length === 0) return { vendor, layanan: [] };

  const { data: paket } = await supabase
    .from("package")
    .select(PAKET_COLS)
    .eq("is_active", true)
    .in("layanan_id", list.map((l) => l.id))
    .order("harga");
  const semua = (paket as (PaketCard & { is_active: boolean; layanan_id: string })[]) ?? [];

  const layananDenganPaket = list
    .map((l) => ({ ...l, paket: semua.filter((p) => p.layanan_id === l.id) }))
    .filter((l) => l.paket.length > 0);

  return { vendor, layanan: layananDenganPaket };
}
