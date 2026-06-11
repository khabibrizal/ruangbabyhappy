import Link from "next/link";
import { getGaleri } from "@/lib/gallery/queries";
import { uploadGaleri, hapusGaleri } from "@/lib/admin/masterActions";

export const dynamic = "force-dynamic";

export default async function MasterGaleriPage() {
  const rows = await getGaleri();
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Galeri</h1>
        <Link href="/admin/master" className="text-sm text-slate-500 underline">← Master</Link>
      </div>

      <form action={uploadGaleri} className="mt-4 flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:flex-row sm:items-center">
        <input name="gambar" type="file" accept="image/*" required className="flex-1 text-sm file:mr-3 file:rounded file:border-0 file:bg-slate-800 file:px-4 file:py-2 file:text-white" />
        <button className="h-11 rounded bg-slate-800 px-4 text-white">Upload</button>
      </form>
      <p className="mt-1 text-xs text-slate-500">Gambar otomatis dikompres (WebP, maks 1600px).</p>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {rows.map((g) => (
          <div key={g.id} className="rounded-lg border border-slate-200 bg-white p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={g.url} alt="Galeri" className="aspect-[3/4] w-full rounded object-cover" />
            <form action={hapusGaleri} className="mt-2">
              <input type="hidden" name="id" value={g.id} />
              <button className="h-8 w-full rounded border border-red-300 px-3 text-xs text-red-600">Hapus</button>
            </form>
          </div>
        ))}
      </div>
    </main>
  );
}
