import { describe, it, expect } from "vitest";
import { formatRupiah } from "@/lib/format/rupiah";

describe("formatRupiah", () => {
  it("format ribuan Indonesia", () => {
    expect(formatRupiah(150000)).toBe("Rp150.000");
    expect(formatRupiah(1050000)).toBe("Rp1.050.000");
    expect(formatRupiah(0)).toBe("Rp0");
  });
  it("null/undefined -> '-'", () => {
    expect(formatRupiah(null)).toBe("-");
    expect(formatRupiah(undefined)).toBe("-");
  });
});
