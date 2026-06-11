import Link from "next/link";
import { listBlackout } from "@/lib/admin/masterQueries";
import { buatBlackout, hapusBlackout } from "@/lib/admin/masterActions";

export const dynamic = "force-dynamic";
const inp = "rounded border border-slate-300 p-2";

export default async function MasterBlackoutPage() {
  const rows = await listBlackout();
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Master Blackout (Tutup)</h1>
        <Link href="/admin/master" className="text-sm text-slate-500 underline">← Master</Link>
      </div>

      <form action={buatBlackout} className="mt-4 grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-white p-4">
        <input name="tanggal" type="date" className={inp} required />
        <input name="keterangan" placeholder="Keterangan (Libur)" className={inp} />
        <button className="col-span-2 h-11 rounded bg-slate-800 px-4 text-white">Tambah Tanggal Tutup</button>
      </form>

      <div className="mt-4 flex flex-col gap-2">
        {rows.map((r) => (
          <div key={r.id} className="flex items-center justify-between rounded border border-slate-200 bg-white p-3">
            <span className="text-sm font-medium text-slate-700">{r.tanggal} {r.keterangan && `· ${r.keterangan}`}</span>
            <form action={hapusBlackout}>
              <input type="hidden" name="id" value={r.id} />
              <button className="h-8 rounded border border-red-300 px-3 text-xs text-red-600">Hapus</button>
            </form>
          </div>
        ))}
      </div>
    </main>
  );
}
