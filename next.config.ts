import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: { remotePatterns: [{ protocol: "https", hostname: "*.supabase.co" }] },
  // Naikkan limit body Server Action agar upload foto (bukti/galeri) muat.
  experimental: { serverActions: { bodySizeLimit: "10mb" } },
};

export default nextConfig;
