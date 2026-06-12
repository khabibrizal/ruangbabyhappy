import { describe, it, expect } from "vitest";
import { localBusiness, productOffer, breadcrumb } from "@/lib/seo/jsonld";
import { SITE_URL } from "@/lib/seo/config";

describe("seo/jsonld", () => {
  it("localBusiness: tipe + lokalitas + geo", () => {
    const b = localBusiness();
    expect(b["@type"]).toBe("PhotographyBusiness");
    expect(b.address.addressLocality).toBe("Sidoarjo");
    expect(b.address.addressCountry).toBe("ID");
    expect(typeof b.geo.latitude).toBe("number");
    expect(b.sameAs.length).toBeGreaterThan(0);
  });
  it("productOffer: harga IDR + InStock + url absolut", () => {
    const p = productOffer({
      nama: "Paket Gold", deskripsi: "isi", harga: 1650000,
      layananNama: "Newborn", path: "/paket/x", image: null,
    });
    expect(p["@type"]).toBe("Product");
    expect(p.name).toBe("Paket Gold — Newborn");
    expect(p.offers.price).toBe(1650000);
    expect(p.offers.priceCurrency).toBe("IDR");
    expect(p.offers.availability).toBe("https://schema.org/InStock");
    expect(p.offers.url).toBe(`${SITE_URL}/paket/x`);
  });
  it("productOffer: deskripsi null -> fallback", () => {
    const p = productOffer({ nama: "Mini", deskripsi: null, harga: 1, layananNama: "Newborn", path: "/p" });
    expect(p.description).toContain("Mini");
  });
  it("breadcrumb: posisi berurutan", () => {
    const b = breadcrumb([{ name: "Home", path: "/" }, { name: "Newborn", path: "/" }]);
    expect(b.itemListElement[0].position).toBe(1);
    expect(b.itemListElement[1].position).toBe(2);
    expect(b.itemListElement[0].item).toBe(`${SITE_URL}/`);
  });
});
