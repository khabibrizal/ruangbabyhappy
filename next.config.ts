import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: { remotePatterns: [{ protocol: "https", hostname: "*.supabase.co" }] },
  // Naikkan limit body upload foto (bukti/galeri). DUA batas di Next 16:
  // - serverActions.bodySizeLimit: batas parser body Server Action.
  // - proxyClientMaxBodySize: batas body request yang lewat "proxy" (middleware);
  //   halaman /admin & /member di-gate proxy, jadi upload galeri kena cap ini (default ~1MB)
  //   -> "Unexpected end of form" bila tak dinaikkan.
  // (sharp tetap mengompres jadi WebP kecil saat simpan.)
  experimental: {
    serverActions: { bodySizeLimit: "25mb" },
    proxyClientMaxBodySize: "25mb",
  },
};

export default nextConfig;
