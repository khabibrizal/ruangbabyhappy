import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo/config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/member", "/booking", "/invoice", "/login", "/register", "/logout", "/api"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
