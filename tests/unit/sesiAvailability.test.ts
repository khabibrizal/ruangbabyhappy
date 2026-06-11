import { describe, it, expect } from "vitest";
import { filterSesiTersedia, type SesiOpsi } from "@/lib/booking/sesiAvailability";

const sesi: SesiOpsi[] = [
  { id: "s1", nama: "Sesi 1", jam_mulai: "09:00:00", urutan: 1 },
  { id: "s2", nama: "Sesi 2", jam_mulai: "13:00:00", urutan: 2 },
];

describe("filterSesiTersedia", () => {
  it("semua tersedia bila tak ada yang terpakai & bukan hari ini", () => {
    const out = filterSesiTersedia(sesi, [], false, false, 0);
    expect(out.map((s) => s.id)).toEqual(["s1", "s2"]);
  });

  it("blackout -> kosong", () => {
    expect(filterSesiTersedia(sesi, [], true, false, 0)).toEqual([]);
  });

  it("sesi terpakai (paid utk layanan+tanggal) dibuang", () => {
    const out = filterSesiTersedia(sesi, ["s1"], false, false, 0);
    expect(out.map((s) => s.id)).toEqual(["s2"]);
  });

  it("hari ini: sesi yang jamnya sudah lewat dibuang", () => {
    // sekarang 10:00 (600 menit) -> Sesi 1 (09:00) lewat, Sesi 2 (13:00) masih
    const out = filterSesiTersedia(sesi, [], false, true, 600);
    expect(out.map((s) => s.id)).toEqual(["s2"]);
  });
});
