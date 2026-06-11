import Link from "next/link";
import PublicShell from "@/components/public/PublicShell";
import { brand } from "@/lib/brand";
import { btnGrad, btnOutline } from "@/components/ui/buttons";
import { getLayananDenganPaket } from "@/lib/catalog/queries";
import { formatRupiah } from "@/lib/format/rupiah";
import GalleryStrip from "@/components/public/GalleryStrip";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const layanan = await getLayananDenganPaket();
  return (
    <PublicShell>
      <main>
        <section className="grad-soft">
          <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
            <span className="inline-block rounded-full bg-white px-3 py-1 text-xs font-bold shadow-sm">
              📷 Baby &amp; Kids Photo · {brand.kota}
            </span>
            <h1 className="mt-4 font-display text-4xl font-extrabold leading-tight">
              Abadikan momen <span className="text-grad">si kecil</span> ✨
            </h1>
            <p className="mt-3 font-semibold text-foreground/60">{brand.tagline}</p>
            <div className="mt-6 flex justify-center gap-3">
              <Link href="#paket" className={btnGrad}>Lihat Paket</Link>
              <Link href="/login" className={btnOutline}>Masuk</Link>
            </div>
          </div>
        </section>

        <GalleryStrip />

        <section id="paket" className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
          <h2 className="font-display text-2xl font-extrabold">Pilih Layanan &amp; Paket</h2>
          {layanan.length === 0 && (
            <p className="mt-4 text-foreground/50">Belum ada paket. (Admin: tambahkan di Master.)</p>
          )}
          {layanan.map((l) => (
            <div key={l.id} className="mt-8">
              <h3 className="text-xs font-extrabold uppercase tracking-wide text-pink-500">{l.nama}</h3>
              <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {l.paket.map((p) => (
                  <div key={p.id} className="rounded-3xl bg-white p-4 shadow-sm">
                    <div className="font-bold">{p.nama}</div>
                    {p.deskripsi && <div className="mt-1 text-sm text-foreground/55">{p.deskripsi}</div>}
                    <div className="mt-1 text-xs text-foreground/45">±{p.durasi_menit} menit</div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="font-display text-lg font-extrabold text-pink-500">{formatRupiah(p.harga)}</span>
                      <Link href={`/paket/${p.id}`} className="rounded-full bg-grad px-4 py-2 text-xs font-bold text-white">
                        Booking →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      </main>
    </PublicShell>
  );
}
