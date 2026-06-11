import { describe, it, expect } from "vitest";
import { TAHAP_PENGERJAAN, LABEL_PENGERJAAN, indexTahap } from "@/lib/booking/statusPengerjaan";

describe("statusPengerjaan", () => {
  it("5 tahap berurutan", () => {
    expect(TAHAP_PENGERJAAN).toEqual(["pilih_foto", "edit", "cetak", "pengiriman", "selesai"]);
  });
  it("label ramah", () => {
    expect(LABEL_PENGERJAAN.pilih_foto).toBe("Pilih Foto");
    expect(LABEL_PENGERJAAN.selesai).toBe("Selesai");
  });
  it("indexTahap: null -> -1 (belum mulai)", () => {
    expect(indexTahap(null)).toBe(-1);
  });
  it("indexTahap: tahap -> posisi", () => {
    expect(indexTahap("pilih_foto")).toBe(0);
    expect(indexTahap("edit")).toBe(1);
    expect(indexTahap("selesai")).toBe(4);
  });
  it("indexTahap: tak dikenal -> -1", () => {
    expect(indexTahap("xxx")).toBe(-1);
  });
});
