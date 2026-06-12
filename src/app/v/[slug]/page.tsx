import Link from "next/link";
import { notFound } from "next/navigation";
import { getVendorBySlug } from "@/lib/vendor/queries";
import { formatRupiah } from "@/lib/format/rupiah";

export const dynamic = "force-dynamic";

export default async function VendorPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getVendorBySlug(slug);
  if (!data) notFound();

  const { vendor, layanan } = data;

  return (
    <div className="min-h-screen bg-rose-50/40 text-slate-800">
      {/* Header brand vendor */}
      <header className="bg-gradient-to-b from-rose-100/70 to-transparent">
        <div className="mx-auto max-w-5xl px-4 py-16 text-center sm:px-6">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">{vendor.nama}</h1>
          {vendor.tagline && <p className="mt-3 text-lg text-slate-500">{vendor.tagline}</p>}
        </div>
      </header>

      {/* Grid paket per layanan */}
      <main className="mx-auto max-w-5xl px-4 pb-16 sm:px-6">
        {layanan.length === 0 && (
          <p className="mt-4 text-center text-slate-500">Belum ada paket tersedia.</p>
        )}
        {layanan.map((l) => (
          <section key={l.id} className="mt-10">
            <h2 className="text-sm font-extrabold uppercase tracking-wide text-rose-500">{l.nama}</h2>
            <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {l.paket.map((p) => (
                <div key={p.id} className="flex flex-col rounded-3xl border border-rose-100 bg-white p-5 shadow-sm transition hover:shadow-md">
                  <div className="text-lg font-bold">{p.nama}</div>
                  {p.deskripsi && <div className="mt-1 flex-1 text-sm text-slate-500">{p.deskripsi}</div>}
                  <div className="mt-2 text-xs font-semibold text-slate-400">±{p.durasi_menit} menit · DP {p.dp_persen}%</div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xl font-extrabold text-rose-500">{formatRupiah(p.harga)}</span>
                    <Link href={`/paket/${p.id}`} className="rounded-full bg-rose-500 px-5 py-2 text-sm font-bold text-white hover:bg-rose-600">
                      Booking →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </main>

      {/* Footer vendor */}
      <footer className="border-t border-rose-100 bg-white/60">
        <div className="mx-auto max-w-5xl px-4 py-8 text-center text-sm text-slate-500 sm:px-6">
          <div className="font-bold text-slate-700">{vendor.nama}</div>
          {vendor.ig && <div className="mt-1">📷 @{vendor.ig}</div>}
          {vendor.alamat && <div className="mt-1">{vendor.alamat}</div>}
        </div>
      </footer>
    </div>
  );
}
