import { describe, it, expect } from "vitest";
import { buildPesanWa, buildRekening } from "@/lib/booking/waPesan";

const base = {
  nama: "Dina",
  kode: "RBH-250612-AB12",
  rincian: "Layanan: Newborn\nPaket: Basic\nJadwal: 2026-06-12 (Pagi)",
  total: 1_500_000,
  rekening: "BCA 12345 a.n Studio",
};

describe("buildPesanWa", () => {
  it("lunas: ada 'Lunas ✅', TANPA sisa/rekening, ada ajakan kembali", () => {
    const t = buildPesanWa({ ...base, sisa: 0, statusKey: "lunas" });
    expect(t).toContain("Halo Kak Dina");
    expect(t).toContain("Lunas ✅");
    expect(t).not.toContain("Sisa yang perlu dilunasi");
    expect(t).not.toContain("BCA 12345");
    expect(t).toContain("Follow IG @ruangbabyhappy");
    expect(t).toContain("ruangbabyhappy.web.id");
  });

  it("unpaid: ada sisa + rekening (per-layanan) + sapaan + ajakan", () => {
    const t = buildPesanWa({ ...base, sisa: 750_000, statusKey: "unpaid" });
    expect(t).toContain("Halo Kak Dina");
    expect(t).toContain("Sisa yang perlu dilunasi: Rp750.000");
    expect(t).toContain("BCA 12345 a.n Studio");
    expect(t).toContain("Status: Belum bayar");
    expect(t).toContain("Follow IG @ruangbabyhappy");
  });

  it("dp_paid: status 'Sudah DP', tetap tampil rekening & sisa", () => {
    const t = buildPesanWa({ ...base, sisa: 1_000_000, statusKey: "dp_paid" });
    expect(t).toContain("Status: Sudah DP");
    expect(t).toContain("Sisa yang perlu dilunasi: Rp1.000.000");
  });

  it("selalu memuat kode & rincian", () => {
    const t = buildPesanWa({ ...base, sisa: 0, statusKey: "lunas" });
    expect(t).toContain("Kode: RBH-250612-AB12");
    expect(t).toContain("Paket: Basic");
  });
});

describe("buildRekening", () => {
  it("pakai data layanan bila bank & no_rek terisi", () => {
    expect(buildRekening({ bank: "Mandiri", no_rek: "999", atas_nama: "Owner" })).toBe(
      "Mandiri 999 a.n Owner",
    );
  });
  it("tanpa atas_nama: hanya bank + no_rek", () => {
    expect(buildRekening({ bank: "BNI", no_rek: "111", atas_nama: null })).toBe("BNI 111");
  });
  it("fallback brand bila layanan kosong / tak lengkap", () => {
    expect(buildRekening(null)).toContain("a.n");
    expect(buildRekening({ bank: "BCA", no_rek: null })).toContain("a.n");
  });
});
