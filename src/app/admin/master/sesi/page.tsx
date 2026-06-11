import Link from "next/link";
import { listSesi } from "@/lib/admin/masterQueries";
import { buatSesi, updateSesi, toggleSesi } from "@/lib/admin/masterActions";

export const dynamic = "force-dynamic";
const inp = "rounded border border-slate-300 p-2";

export default async function MasterSesiPage() {
  const rows = await listSesi();
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Master Sesi</h1>
        <Link href="/admin/master" className="text-sm text-slate-500 underline">← Master</Link>
      </div>

      <form action={buatSesi} className="mt-4 grid grid-cols-3 gap-3 rounded-lg border border-slate-200 bg-white p-4">
        <input name="nama" placeholder="Nama (Sesi 3)" className={inp} required />
        <input name="jam_mulai" type="time" className={inp} required defaultValue="09:00" />
        <input name="urutan" type="number" placeholder="Urutan" className={inp} defaultValue={0} />
        <button className="col-span-3 h-11 rounded bg-slate-800 px-4 text-white">Tambah Sesi</button>
      </form>

      <div className="mt-4 flex flex-col gap-3">
        {rows.map((r) => (
          <div key={r.id} className="rounded border border-slate-200 bg-white p-3">
            <form action={updateSesi} className="grid grid-cols-3 gap-2">
              <input type="hidden" name="id" value={r.id} />
              <input name="nama" defaultValue={r.nama} className={inp} required />
              <input name="jam_mulai" type="time" defaultValue={r.jam_mulai.slice(0, 5)} className={inp} required />
              <input name="urutan" type="number" defaultValue={r.urutan} className={inp} />
              <div className="col-span-3 flex items-center gap-2">
                <button className="h-9 rounded bg-slate-800 px-3 text-sm text-white">Simpan</button>
                {!r.is_active && <span className="text-xs text-slate-400">(nonaktif)</span>}
              </div>
            </form>
            <form action={toggleSesi} className="mt-2">
              <input type="hidden" name="id" value={r.id} />
              <input type="hidden" name="aktif" value={String(r.is_active)} />
              <button className="h-8 rounded border border-slate-300 px-3 text-xs">
                {r.is_active ? "Nonaktifkan" : "Aktifkan"}
              </button>
            </form>
          </div>
        ))}
      </div>
    </main>
  );
}
