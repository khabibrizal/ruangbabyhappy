import { describe, it, expect } from "vitest";
import { SITE_URL, absoluteUrl, buildMetadata } from "@/lib/seo/config";

describe("seo/config", () => {
  it("absoluteUrl menambah SITE_URL untuk path relatif", () => {
    expect(absoluteUrl("/paket/abc")).toBe(`${SITE_URL}/paket/abc`);
    expect(absoluteUrl("paket/abc")).toBe(`${SITE_URL}/paket/abc`);
  });
  it("absoluteUrl membiarkan URL absolut", () => {
    expect(absoluteUrl("https://x.supabase.co/a.png")).toBe("https://x.supabase.co/a.png");
  });
  it("buildMetadata set canonical + OG + twitter", () => {
    const m = buildMetadata({ title: "T", description: "D", path: "/paket/1" });
    expect(m.alternates?.canonical).toBe(`${SITE_URL}/paket/1`);
    expect(m.openGraph?.title).toBe("T");
    expect((m.openGraph as { url?: string }).url).toBe(`${SITE_URL}/paket/1`);
    expect(m.twitter?.card).toBe("summary_large_image");
    const og = m.openGraph as { images?: { url: string }[] };
    expect(og.images?.[0].url).toBe(`${SITE_URL}/og-default.png`);
  });
  it("buildMetadata pakai image kustom (absolut)", () => {
    const m = buildMetadata({ title: "T", description: "D", path: "/p", image: "https://x.supabase.co/f.png" });
    const og = m.openGraph as { images?: { url: string }[] };
    expect(og.images?.[0].url).toBe("https://x.supabase.co/f.png");
  });
});
