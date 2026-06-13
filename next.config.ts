import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: { remotePatterns: [{ protocol: "https", hostname: "*.supabase.co" }] },
  // Jaga dependency berat tetap eksternal (tak di-bundle ke serverless function) -> footprint memori
  // function lebih kecil & cold-start tak OOM. sharp (kompres foto) & @react-pdf (invoice /invoice/[kode]).
  serverExternalPackages: ["sharp", "@react-pdf/renderer"],
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
