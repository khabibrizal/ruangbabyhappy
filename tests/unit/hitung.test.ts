import { describe, it, expect } from "vitest";
import { hitungDiskon, hitungTagihan, hitungDp } from "@/lib/booking/hitung";

describe("hitungDiskon", () => {
  it("member returning -> nilai diskon paket", () => {
    expect(hitungDiskon({ returning: true, diskonReturning: 50000 })).toBe(50000);
  });
  it("bukan returning -> 0", () => {
    expect(hitungDiskon({ returning: false, diskonReturning: 50000 })).toBe(0);
  });
});

describe("hitungTagihan", () => {
  it("paket + ongkos - diskon", () => {
    expect(hitungTagihan({ harga: 1000000, ongkos: 100000, diskon: 50000 })).toBe(1050000);
  });
  it("studio (ongkos 0), tanpa diskon", () => {
    expect(hitungTagihan({ harga: 750000, ongkos: 0, diskon: 0 })).toBe(750000);
  });
});

describe("hitungDp", () => {
  it("30% dari tagihan, dibulatkan", () => {
    expect(hitungDp(1050000, 30)).toBe(315000);
    expect(hitungDp(750000, 30)).toBe(225000);
  });
  it("persen lain", () => {
    expect(hitungDp(1000000, 50)).toBe(500000);
  });
  it("pembulatan", () => {
    expect(hitungDp(100001, 30)).toBe(30000); // 30000.3 -> 30000
  });
});
