import Link from "next/link";
import { getLaporan, type FilterLaporan } from "@/lib/report/queries";
import { rekapPendapatan } from "@/lib/report/aggregate";
import { formatRupiah } from "@/lib/format/rupiah";

export const dynamic = "force-dynamic";
const LABEL: Record<string, string> = { unpaid: "Belum bayar", dp_paid: "DP terbayar", lunas: "Lunas" };

export default async function LaporanPage({ searchParams }: { searchParams: Promise<FilterLaporan> }) {
  const f = await searchParams;
  const rows = await getLaporan(f);
  const rekap = rekapPendapatan(
    rows.map((r) => r.payment ?? { status_bayar: "unpaid", total: 0, ongkos: 0, diskon: 0, dp_amount: 0 }),
  );
  const csvQuery = new URLSearchParams(Object.entries(f).filter(([, v]) => v) as [string, string][]).toString();

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Laporan Transaksi</h1>
        <Link href="/admin" className="text-sm text-slate-500 underline">← Dashboard</Link>
      </div>

      <form method="get" className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex flex-col text-sm">Dari<input type="date" name="dari" defaultValue={f.dari ?? ""} className="mt-1 rounded border border-slate-300 p-2" /></label>
        <label className="flex flex-col text-sm">Sampai<input type="date" name="sampai" defaultValue={f.sampai ?? ""} className="mt-1 rounded border border-slate-300 p-2" /></label>
        <label className="flex flex-col text-sm">Status
          <select name="status" defaultValue={f.status ?? ""} className="mt-1 rounded border border-slate-300 p-2">
            <option value="">Semua</option><option value="unpaid">Belum bayar</option><option value="dp_paid">DP terbayar</option><option value="lunas">Lunas</option>
          </select>
        </label>
        <button className="h-11 rounded bg-slate-800 px-4 text-white">Terapkan</button>
      </form>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4"><p className="text-sm text-slate-500">Total Pendapatan</p><p className="mt-1 text-xl font-bold">{formatRupiah(rekap.totalPendapatan)}</p></div>
        <div className="rounded-lg border border-slate-200 bg-white p-4"><p className="text-sm text-slate-500">Jumlah Booking</p><p className="mt-1 text-xl font-bold">{rekap.jumlahBooking}</p></div>
      </div>

      <div className="mt-4">
        <a href={`/admin/laporan/csv${csvQuery ? `?${csvQuery}` : ""}`} className="inline-flex h-10 items-center rounded border border-slate-300 px-4 text-sm">Download CSV</a>
      </div>

      <div className="mt-4 overflow-x-auto">
        {rows.length === 0 ? <p className="text-slate-500">Tidak ada transaksi.</p> : (
          <table className="w-full min-w-[680px] border-collapse text-sm">
            <thead><tr className="border-b text-left text-slate-500">
              <th className="py-2 pr-3">Kode</th><th className="py-2 pr-3">Tanggal</th><th className="py-2 pr-3">Layanan</th><th className="py-2 pr-3">Paket</th><th className="py-2 pr-3">Member</th><th className="py-2 pr-3">Status</th><th className="py-2 pr-3 text-right">Total</th>
            </tr></thead>
            <tbody>
              {rows.map((r) => {
                const pay = r.payment; const status = pay?.status_bayar ?? "unpaid";
                const tagihan = (pay?.total ?? 0) + (pay?.ongkos ?? 0) - (pay?.diskon ?? 0);
                return (
                  <tr key={r.kode_booking} className="border-b">
                    <td className="py-2 pr-3 font-mono">{r.kode_booking}</td>
                    <td className="py-2 pr-3">{r.tanggal}</td>
                    <td className="py-2 pr-3">{r.package?.layanan?.nama ?? "-"}</td>
                    <td className="py-2 pr-3">{r.package?.nama ?? "-"}</td>
                    <td className="py-2 pr-3">{r.profile?.nama ?? "Member"}</td>
                    <td className="py-2 pr-3">{LABEL[status] ?? status}</td>
                    <td className="py-2 pr-3 text-right">{formatRupiah(tagihan)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
