import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: { remotePatterns: [{ protocol: "https", hostname: "*.supabase.co" }] },
  // Naikkan limit body Server Action agar upload foto (bukti/galeri) muat
  // (foto HP bisa 10-20MB; sharp tetap mengompres jadi WebP kecil saat simpan).
  experimental: { serverActions: { bodySizeLimit: "25mb" } },
};

export default nextConfig;
