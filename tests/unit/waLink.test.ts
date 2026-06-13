import { describe, it, expect } from "vitest";
import { normalisasiWa, buildWaWebUrl } from "@/lib/booking/waLink";

describe("waLink", () => {
  it("normalisasiWa: 0xxx -> 62xxx, buang non-digit", () => {
    expect(normalisasiWa("081234567890")).toBe("6281234567890");
    expect(normalisasiWa("+62 822-3368-4933")).toBe("6282233684933");
    expect(normalisasiWa("6285156217634")).toBe("6285156217634");
  });

  it("buildWaWebUrl: pakai web.whatsapp.com/send + nomor ternormalisasi + param resolve", () => {
    const url = buildWaWebUrl("081234567890", "Halo");
    expect(url).toContain("https://web.whatsapp.com/send");
    expect(url).toContain("phone=6281234567890");
    expect(url).toContain("type=phone_number");
    expect(url).toContain("app_absent=0");
  });

  it("buildWaWebUrl: teks di-encode", () => {
    const url = buildWaWebUrl("0812", "Halo Kak\nbaris dua");
    expect(url).toContain("text=Halo%20Kak%0Abaris%20dua");
  });
});
