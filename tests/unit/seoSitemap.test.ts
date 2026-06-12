import { describe, it, expect } from "vitest";
import { toSitemapEntries } from "@/lib/seo/sitemap-data";
import { SITE_URL } from "@/lib/seo/config";

describe("seo/sitemap toSitemapEntries", () => {
  const now = new Date("2026-06-12T00:00:00Z");
  const data = {
    paket: [{ id: "p1", created_at: "2026-06-01T00:00:00Z" }],
    vendor: [{ slug: "fillens" }],
  };
  it("entri pertama = home priority 1", () => {
    const e = toSitemapEntries(data, now);
    expect(e[0].url).toBe(`${SITE_URL}/`);
    expect(e[0].priority).toBe(1);
  });
  it("paket -> /paket/{id} priority 0.8 + lastmod created_at", () => {
    const e = toSitemapEntries(data, now);
    const p = e.find((x) => x.url === `${SITE_URL}/paket/p1`);
    expect(p?.priority).toBe(0.8);
    expect((p?.lastModified as Date).toISOString()).toBe("2026-06-01T00:00:00.000Z");
  });
  it("vendor non-default -> /v/{slug} priority 0.6", () => {
    const e = toSitemapEntries(data, now);
    const v = e.find((x) => x.url === `${SITE_URL}/v/fillens`);
    expect(v?.priority).toBe(0.6);
  });
  it("total entri = 1 + paket + vendor", () => {
    expect(toSitemapEntries(data, now)).toHaveLength(3);
  });
});
