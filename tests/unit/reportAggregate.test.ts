import { describe, it, expect } from "vitest";
import { rekapPendapatan } from "@/lib/report/aggregate";

describe("rekapPendapatan", () => {
  it("lunas -> tagihan (total+ongkos-diskon); dp_paid -> dp_amount; unpaid -> 0", () => {
    const r = rekapPendapatan([
      { status_bayar: "lunas", total: 1000000, ongkos: 100000, diskon: 50000, dp_amount: 315000 },
      { status_bayar: "dp_paid", total: 750000, ongkos: 0, diskon: 0, dp_amount: 225000 },
      { status_bayar: "unpaid", total: 500000, ongkos: 0, diskon: 0, dp_amount: null },
    ]);
    expect(r.totalPendapatan).toBe(1050000 + 225000);
    expect(r.jumlahBooking).toBe(3);
  });
});
