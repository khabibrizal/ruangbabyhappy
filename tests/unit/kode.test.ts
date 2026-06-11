import { describe, it, expect } from "vitest";
import { buildKodeBooking } from "@/lib/booking/kode";

describe("buildKodeBooking", () => {
  it("format RBH-<tgl tanpa strip>-<suffix uppercase>", () => {
    expect(buildKodeBooking("2026-07-21", "ab12")).toBe("RBH-20260721-AB12");
  });
});
