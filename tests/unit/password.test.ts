import { describe, it, expect } from "vitest";
import { validasiPassword } from "@/lib/auth/password";

describe("validasiPassword", () => {
  it("tolak kurang dari 8 karakter", () => {
    expect(validasiPassword("123", "123")).toMatch(/minimal 8/);
    expect(validasiPassword("", "")).toMatch(/minimal 8/);
  });
  it("tolak konfirmasi tidak cocok", () => {
    expect(validasiPassword("rahasia12", "rahasia99")).toMatch(/tidak cocok/);
  });
  it("lolos bila >=8 & cocok", () => {
    expect(validasiPassword("rahasia12", "rahasia12")).toBeNull();
  });
});
