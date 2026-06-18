import type { Metadata } from "next";

/** Base URL situs. Dari env agar migrasi domain = ganti 1 nilai. Tanpa trailing slash. */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.ruangbabyhappy.web.id"
).replace(/\/+$/, "");

export const SITE_NAME = "Ruang Baby Happy";
export const DEFAULT_OG = "/og-default.png";

/** Ubah path relatif jadi URL absolut. URL yang sudah absolut dibiarkan. */
export function absoluteUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Helper DRY: bangun Metadata lengkap (title/description/canonical/OG/Twitter). */
export function buildMetadata(opts: {
  title: string;
  description: string;
  path: string;
  image?: string | null;
}): Metadata {
  const url = absoluteUrl(opts.path);
  const image = absoluteUrl(opts.image ?? DEFAULT_OG);
  return {
    title: opts.title,
    description: opts.description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: "id_ID",
      url,
      title: opts.title,
      description: opts.description,
      images: [{ url: image, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: opts.title,
      description: opts.description,
      images: [image],
    },
  };
}
