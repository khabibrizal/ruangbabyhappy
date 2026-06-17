import { describe, it, expect } from "vitest";
import { chunk5 } from "@/lib/resi/ResiDocument";

describe("chunk5 (5 client per halaman A4)", () => {
  it("kosong -> tidak ada halaman", () => {
    expect(chunk5([])).toEqual([]);
  });
  it("<=5 -> 1 halaman", () => {
    expect(chunk5([1, 2, 3]).length).toBe(1);
    expect(chunk5([1, 2, 3, 4, 5]).length).toBe(1);
  });
  it("6 -> 2 halaman (5 + 1)", () => {
    const h = chunk5([1, 2, 3, 4, 5, 6]);
    expect(h.length).toBe(2);
    expect(h[0]).toHaveLength(5);
    expect(h[1]).toHaveLength(1);
  });
  it("12 -> 3 halaman (5 + 5 + 2)", () => {
    const h = chunk5(Array.from({ length: 12 }, (_, i) => i));
    expect(h.map((g) => g.length)).toEqual([5, 5, 2]);
  });
});
