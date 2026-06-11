import Link from "next/link";
import { listTransaksiAdmin, TRANSAKSI_PER_PAGE, type FilterTransaksi } from "@/lib/booking/queries";
import { formatRupiah } from "@/lib/format/rupiah";
import { LABEL_PENGERJAAN, indexTahap, TAHAP_PENGERJAAN } from "@/lib/booking/statusPengerjaan";

export const dynamic = "force-dynamic";
const LABEL_BAYAR: Record<string, string> = { unpaid: "Belum bayar", dp_paid: "Sudah DP", lunas: "Lunas" };

export default async function TransaksiAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; dari?: string; sampai?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const filter: FilterTransaksi = { status: sp.status || undefined, dari: sp.dari || undefined, sampai: sp.sampai || undefined, page };
  const { rows, total } = await listTransaksiAdmin(filter);
  const totalHalaman = Math.max(1, Math.ceil(total / TRANSAKSI_PER_PAGE));

  const buatHref = (p: number) => {
    const params = new URLSearchParams();
    if (filter.status) params.set("status", filter.status);
    if (filter.dari) params.set("dari", filter.dari);
    if (filter.sampai) params.set("sampai", filter.sampai);
    params.set("page", String(p));
    return `/admin/transaksi?${params.toString()}`;
  };

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Transaksi</h1>
        <Link href="/admin" className="text-sm text-slate-500 underline">← Dashboard</Link>
      </div>

      <form method="get" className="mt-4 flex flex-wrap items-end gap-3">
        <label className="flex flex-col text-sm">Status
          <select name="status" defaultValue={filter.status ?? ""} className="mt-1 rounded border border-slate-300 p-2">
            <option value="">Semua</option><option value="unpaid">Belum bayar</option><option value="dp_paid">Sudah DP</option><option value="lunas">Lunas</option>
          </select>
        </label>
        <label className="flex flex-col text-sm">Dari<input type="date" name="dari" defaultValue={filter.dari ?? ""} className="mt-1 rounded border border-slate-300 p-2" /></label>
        <label className="flex flex-col text-sm">Sampai<input type="date" name="sampai" defaultValue={filter.sampai ?? ""} className="mt-1 rounded border border-slate-300 p-2" /></label>
        <button className="h-11 rounded bg-slate-800 px-4 text-white">Terapkan</button>
        <Link href="/admin/transaksi" className="flex h-11 items-center rounded border border-slate-300 px-4 text-sm">Reset</Link>
      </form>

      <p className="mt-4 text-sm text-slate-500">{total} transaksi · halaman {page} dari {totalHalaman}</p>

      {rows.length === 0 ? (
        <p className="mt-2 text-slate-500">Tidak ada transaksi.</p>
      ) : (
        <div className="mt-2 flex flex-col gap-3">
          {rows.map((r) => {
            const status = r.payment?.status_bayar ?? "unpaid";
            const tahap = indexTahap(r.status_pengerjaan);
            const tagihan = (r.payment?.total ?? 0) + (r.payment?.ongkos ?? 0) - (r.payment?.diskon ?? 0);
            return (
              <Link key={r.id} href={`/admin/transaksi/${r.kode_booking}`} className="block rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-mono font-semibold">{r.kode_booking}</span>
                  <span className="flex gap-1">
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-xs">{LABEL_BAYAR[status] ?? status}</span>
                    <span className="rounded bg-pink-100 px-2 py-0.5 text-xs text-pink-600">{tahap < 0 ? "Belum mulai" : LABEL_PENGERJAAN[TAHAP_PENGERJAAN[tahap]]}</span>
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  {r.package?.layanan?.nama ?? "-"} · {r.package?.nama ?? "-"} · {r.tanggal} {r.sesi?.nama ?? ""} · {r.profile?.nama ?? "Member"}
                </p>
                <p className="mt-1 text-sm">Total: {formatRupiah(tagihan)}</p>
              </Link>
            );
          })}
        </div>
      )}

      {totalHalaman > 1 && (
        <div className="mt-6 flex items-center justify-between">
          {page > 1 ? <Link href={buatHref(page - 1)} className="flex h-10 items-center rounded border border-slate-300 px-4 text-sm">← Sebelumnya</Link> : <span className="flex h-10 items-center rounded border border-slate-200 px-4 text-sm text-slate-300">← Sebelumnya</span>}
          <span className="text-sm text-slate-500">{page} / {totalHalaman}</span>
          {page < totalHalaman ? <Link href={buatHref(page + 1)} className="flex h-10 items-center rounded border border-slate-300 px-4 text-sm">Berikutnya →</Link> : <span className="flex h-10 items-center rounded border border-slate-200 px-4 text-sm text-slate-300">Berikutnya →</span>}
        </div>
      )}
    </main>
  );
}
