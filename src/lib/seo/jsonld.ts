import { brand } from "@/lib/brand";
import { SITE_URL, SITE_NAME, DEFAULT_OG, absoluteUrl } from "@/lib/seo/config";

/** LocalBusiness sitewide (alamat, telepon, geo dari brand.ts). */
export function localBusiness() {
  return {
    "@context": "https://schema.org",
    "@type": "PhotographyBusiness",
    name: SITE_NAME,
    image: absoluteUrl(DEFAULT_OG),
    url: SITE_URL,
    telephone: brand.telepon,
    address: {
      "@type": "PostalAddress",
      streetAddress: brand.alamatLengkap,
      addressLocality: brand.kota,
      addressRegion: "Jawa Timur",
      addressCountry: "ID",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: brand.geo.lat,
      longitude: brand.geo.lng,
    },
    sameAs: [brand.igUrl],
  };
}

/** Product + Offer untuk satu paket. */
export function productOffer(p: {
  nama: string;
  deskripsi: string | null;
  harga: number;
  image?: string | null;
  layananNama: string;
  path: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${p.nama} — ${p.layananNama}`,
    description: p.deskripsi ?? `${p.nama} di ${SITE_NAME}`,
    image: absoluteUrl(p.image ?? DEFAULT_OG),
    brand: { "@type": "Brand", name: SITE_NAME },
    offers: {
      "@type": "Offer",
      url: absoluteUrl(p.path),
      price: p.harga,
      priceCurrency: "IDR",
      availability: "https://schema.org/InStock",
    },
  };
}

/** BreadcrumbList dari daftar {name, path}. */
export function breadcrumb(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: absoluteUrl(it.path),
    })),
  };
}
