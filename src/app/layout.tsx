import type { Metadata } from "next";
import { Baloo_2, Nunito } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { SITE_URL, SITE_NAME, DEFAULT_OG } from "@/lib/seo/config";
import JsonLd from "@/components/seo/JsonLd";
import { localBusiness } from "@/lib/seo/jsonld";
import FlashToast from "@/components/ui/FlashToast";

const baloo = Baloo_2({ variable: "--font-baloo", subsets: ["latin"], weight: ["500","600","700","800"] });
const nunito = Nunito({ variable: "--font-nunito", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Ruang Baby Happy — Booking Foto Bayi & Anak Sidoarjo",
  description:
    "Ruang Baby Happy — studio foto bayi & anak (newborn, cakesmash, maternity, sitter) di Sidoarjo. Bisa home service. Booking online.",
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "id_ID",
    url: SITE_URL,
    images: [{ url: DEFAULT_OG, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image", images: [DEFAULT_OG] },
  // Verifikasi Google Search Console (metode HTML tag). Isi via env
  // NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION; boleh BEBERAPA kode dipisah koma
  // (mis. property domain lama + baru) -> dirender jadi beberapa meta tag.
  verification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION.split(",").map((s) => s.trim()).filter(Boolean) }
    : undefined,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" className={`${baloo.variable} ${nunito.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <JsonLd data={localBusiness()} />
        {children}
        <Suspense fallback={null}>
          <FlashToast />
        </Suspense>
      </body>
    </html>
  );
}
