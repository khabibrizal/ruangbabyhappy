export type BarisBayar = { status_bayar: string; total: number; ongkos: number; diskon: number; dp_amount: number | null };

/** Uang masuk: lunas -> (total+ongkos-diskon), dp_paid -> dp_amount, unpaid -> 0. */
export function rekapPendapatan(rows: BarisBayar[]): { totalPendapatan: number; jumlahBooking: number } {
  let totalPendapatan = 0;
  for (const r of rows) {
    if (r.status_bayar === "lunas") totalPendapatan += r.total + r.ongkos - r.diskon;
    else if (r.status_bayar === "dp_paid") totalPendapatan += r.dp_amount ?? 0;
  }
  return { totalPendapatan, jumlahBooking: rows.length };
}
