/** Format angka rupiah: 150000 -> "Rp150.000". null/undefined -> "-". */
export function formatRupiah(nilai: number | null | undefined): string {
  if (nilai === null || nilai === undefined) return "-";
  return "Rp" + nilai.toLocaleString("id-ID");
}
