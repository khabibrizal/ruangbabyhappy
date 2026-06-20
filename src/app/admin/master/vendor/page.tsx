import Link from "next/link";
import { listVendor } from "@/lib/admin/masterQueries";
import { buatVendor, updateVendor, toggleVendor } from "@/lib/admin/masterActions";
import SubmitButton from "@/components/ui/SubmitButton";

export const dynamic = "force-dynamic";
const inp = "rounded border border-slate-300 p-2";

export default async function MasterVendorPage() {
  const rows = await listVendor();
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Master Vendor</h1>
        <Link href="/admin/master" className="text-sm text-slate-500 underline">← Master</Link>
      </div>

      <form action={buatVendor} className="mt-4 grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-white p-4">
        <input name="nama" placeholder="Nama vendor" className={`col-span-2 ${inp}`} required />
        <input name="slug" placeholder="Slug (mis. fillens)" className={inp} required />
        <input name="ig" placeholder="Instagram" className={inp} />
        <input name="tagline" placeholder="Tagline" className={`col-span-2 ${inp}`} />
        <input name="alamat" placeholder="Alamat" className={`col-span-2 ${inp}`} />
        <label className="col-span-2 flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" name="butuh_anak" defaultChecked /> Butuh data anak (sesi bayi/anak)
        </label>
        <SubmitButton className="col-span-2 h-11 rounded bg-slate-800 px-4 text-white">Tambah Vendor</SubmitButton>
      </form>

      <div className="mt-4 flex flex-col gap-3">
        {rows.map((r) => (
          <div key={r.id} className="rounded border border-slate-200 bg-white p-3">
            <form action={updateVendor} className="grid grid-cols-2 gap-2">
              <input type="hidden" name="id" value={r.id} />
              <input name="nama" defaultValue={r.nama} className={`col-span-2 ${inp}`} required />
              <input name="slug" defaultValue={r.slug} className={inp} required />
              <input name="ig" defaultValue={r.ig ?? ""} placeholder="Instagram" className={inp} />
              <input name="tagline" defaultValue={r.tagline ?? ""} placeholder="Tagline" className={`col-span-2 ${inp}`} />
              <input name="alamat" defaultValue={r.alamat ?? ""} placeholder="Alamat" className={`col-span-2 ${inp}`} />
              <label className="col-span-2 flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" name="butuh_anak" defaultChecked={r.butuh_anak} /> Butuh data anak
              </label>
              <div className="col-span-2 flex items-center gap-2">
                <SubmitButton className="h-9 rounded bg-slate-800 px-3 text-sm text-white">Simpan</SubmitButton>
                <span className="text-xs text-slate-500">
                  /v/{r.slug} {r.is_default && "· (default)"} {!r.is_active && "· (nonaktif)"}
                </span>
              </div>
            </form>
            <form action={toggleVendor} className="mt-2">
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
