import Link from "next/link";
import { listPaket, listLayanan } from "@/lib/admin/masterQueries";
import { buatPaket, updatePaket, togglePaket } from "@/lib/admin/masterActions";
import { formatRupiah } from "@/lib/format/rupiah";
import SubmitButton from "@/components/ui/SubmitButton";

export const dynamic = "force-dynamic";
const inp = "rounded border border-slate-300 p-2";

export default async function MasterPaketPage() {
  const [rows, layanan] = await Promise.all([listPaket(), listLayanan()]);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Master Paket</h1>
        <Link href="/admin/master" className="text-sm text-slate-500 underline">← Master</Link>
      </div>

      <form action={buatPaket} className="mt-4 grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-white p-4">
        <select name="layanan_id" className={`col-span-2 ${inp}`} required defaultValue="">
          <option value="" disabled>Pilih layanan…</option>
          {layanan.map((l) => <option key={l.id} value={l.id}>{l.nama}</option>)}
        </select>
        <input name="nama" placeholder="Nama paket" className={`col-span-2 ${inp}`} required />
        <input name="deskripsi" placeholder="Deskripsi" className={`col-span-2 ${inp}`} />
        <input name="harga" type="number" placeholder="Harga" className={inp} required />
        <input name="durasi_menit" type="number" placeholder="Durasi (menit)" className={inp} required />
        <input name="diskon_returning" type="number" placeholder="Diskon pelanggan lama (Rp)" className={inp} defaultValue={0} />
        <input name="dp_persen" type="number" placeholder="DP %" className={inp} defaultValue={30} />
        <div className="col-span-2 flex flex-wrap items-center gap-4 text-sm text-slate-600">
          <span className="text-slate-400">Lokasi tersedia:</span>
          <label className="flex items-center gap-1.5"><input type="checkbox" name="bisa_studio" defaultChecked /> Di Studio</label>
          <label className="flex items-center gap-1.5"><input type="checkbox" name="bisa_home" defaultChecked /> Home Service</label>
        </div>
        <SubmitButton className="col-span-2 h-11 rounded bg-slate-800 px-4 text-white">Tambah Paket</SubmitButton>
      </form>

      <div className="mt-4 flex flex-col gap-3">
        {rows.map((r) => (
          <div key={r.id} className="rounded border border-slate-200 bg-white p-3">
            <form action={updatePaket} className="grid grid-cols-2 gap-2">
              <input type="hidden" name="id" value={r.id} />
              <select name="layanan_id" className={`col-span-2 ${inp}`} required defaultValue={r.layanan_id}>
                {layanan.map((l) => <option key={l.id} value={l.id}>{l.nama}</option>)}
              </select>
              <input name="nama" defaultValue={r.nama} className={`col-span-2 ${inp}`} required />
              <input name="deskripsi" defaultValue={r.deskripsi ?? ""} placeholder="Deskripsi" className={`col-span-2 ${inp}`} />
              <input name="harga" type="number" defaultValue={r.harga} className={inp} required />
              <input name="durasi_menit" type="number" defaultValue={r.durasi_menit} className={inp} required />
              <input name="diskon_returning" type="number" defaultValue={r.diskon_returning} className={inp} />
              <input name="dp_persen" type="number" defaultValue={r.dp_persen} className={inp} />
              <div className="col-span-2 flex flex-wrap items-center gap-4 text-sm text-slate-600">
                <span className="text-slate-400">Lokasi:</span>
                <label className="flex items-center gap-1.5"><input type="checkbox" name="bisa_studio" defaultChecked={r.bisa_studio} /> Di Studio</label>
                <label className="flex items-center gap-1.5"><input type="checkbox" name="bisa_home" defaultChecked={r.bisa_home} /> Home Service</label>
              </div>
              <div className="col-span-2 flex items-center gap-2">
                <SubmitButton className="h-9 rounded bg-slate-800 px-3 text-sm text-white">Simpan</SubmitButton>
                <span className="text-xs text-slate-500">
                  {formatRupiah(r.harga)} · DP {r.dp_persen}% {!r.is_active && "· (nonaktif)"}
                </span>
              </div>
            </form>
            <form action={togglePaket} className="mt-2">
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
