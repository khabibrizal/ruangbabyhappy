import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/seo/config";

export type PaketSitemap = { id: string; created_at: string };
export type VendorSitemap = { slug: string };

/** Ambil paket aktif + vendor non-default untuk sitemap. */
export async function getSitemapData(): Promise<{ paket: PaketSitemap[]; vendor: VendorSitemap[] }> {
  const supabase = await createClient();
  const { data: paket } = await supabase
    .from("package")
    .select("id, created_at")
    .eq("is_active", true);
  const { data: vendor } = await supabase
    .from("vendor")
    .select("slug")
    .eq("is_active", true)
    .eq("is_default", false);
  return {
    paket: (paket as PaketSitemap[]) ?? [],
    vendor: (vendor as VendorSitemap[]) ?? [],
  };
}

/** Transform pure -> entri sitemap. `now` diinject agar deterministik & bisa diuji. */
export function toSitemapEntries(
  data: { paket: PaketSitemap[]; vendor: VendorSitemap[] },
  now: Date,
): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    ...data.paket.map((p) => ({
      url: `${SITE_URL}/paket/${p.id}`,
      lastModified: new Date(p.created_at),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    ...data.vendor.map((v) => ({
      url: `${SITE_URL}/v/${v.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
