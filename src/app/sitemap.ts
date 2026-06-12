import type { MetadataRoute } from "next";
import { getSitemapData, toSitemapEntries } from "@/lib/seo/sitemap-data";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const data = await getSitemapData();
  return toSitemapEntries(data, new Date());
}
