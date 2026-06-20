import Link from "next/link";
import { listZona } from "@/lib/admin/masterQueries";
import { buatZona, updateZona, toggleZona } from "@/lib/admin/masterActions";
import { formatRupiah } from "@/lib/format/rupiah";
import SubmitButton from "@/components/ui/SubmitButton";

export const dynamic = "force-dynamic";
const inp = "rounded border border-slate-300 p-2";

export default async function MasterZonaPage() {
  const rows = await listZona();
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Master Zona Ongkos</h1>
        <Link href="/admin/master" className="text-sm text-slate-500 underline">← Master</Link>
      </div>

      <form action={buatZona} className="mt-4 grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-white p-4">
        <input name="nama" placeholder="Nama (Zona 4)" className={inp} required />
        <input name="keterangan" placeholder="Keterangan (20–30 km)" className={inp} />
        <input name="biaya" type="number" placeholder="Biaya (Rp)" className={inp} required />
        <input name="urutan" type="number" placeholder="Urutan" className={inp} defaultValue={0} />
        <SubmitButton className="col-span-2 h-11 rounded bg-slate-800 px-4 text-white">Tambah Zona</SubmitButton>
      </form>

      <div className="mt-4 flex flex-col gap-3">
        {rows.map((r) => (
          <div key={r.id} className="rounded border border-slate-200 bg-white p-3">
            <form action={updateZona} className="grid grid-cols-2 gap-2">
              <input type="hidden" name="id" value={r.id} />
              <input name="nama" defaultValue={r.nama} className={inp} required />
              <input name="keterangan" defaultValue={r.keterangan ?? ""} placeholder="Keterangan" className={inp} />
              <input name="biaya" type="number" defaultValue={r.biaya} className={inp} required />
              <input name="urutan" type="number" defaultValue={r.urutan} className={inp} />
              <div className="col-span-2 flex items-center gap-2">
                <SubmitButton className="h-9 rounded bg-slate-800 px-3 text-sm text-white">Simpan</SubmitButton>
                <span className="text-xs text-slate-500">{formatRupiah(r.biaya)} {!r.is_active && "· (nonaktif)"}</span>
              </div>
            </form>
            <form action={toggleZona} className="mt-2">
              <input type="hidden" name="id" value={r.id} />
              <input type="hidden" name="aktif" value={String(r.is_active)} />
              <SubmitButton className="h-8 rounded border border-slate-300 px-3 text-xs">
                {r.is_active ? "Nonaktifkan" : "Aktifkan"}
              </SubmitButton>
            </form>
          </div>
        ))}
      </div>
    </main>
  );
}
