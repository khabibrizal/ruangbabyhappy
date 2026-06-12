import Link from "next/link";
import PublicShell from "@/components/public/PublicShell";
import { brand } from "@/lib/brand";
import { btnGrad, btnOutline } from "@/components/ui/buttons";
import { getLayananDenganPaket } from "@/lib/catalog/queries";
import { formatRupiah } from "@/lib/format/rupiah";
import GalleryStrip from "@/components/public/GalleryStrip";
import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo/config";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildMetadata({
  title: `Ruang Baby Happy — Foto Newborn, Cakesmash & Maternity ${brand.kota}`,
  description:
    `Studio foto bayi & anak di ${brand.kota}: newborn, cakesmash, maternity, sitter. Bisa home service. Booking online mudah.`,
  path: "/",
});

const AKSEN: Record<string, string> = {
  newborn: "text-pink-500",
  cakesmash: "text-orange-500",
  maternity: "text-emerald-500",
  sitter: "text-sky-500",
};

const LANGKAH = [
  { n: "1", t: "Daftar / Masuk", d: "Buat akun untuk booking & tracking." },
  { n: "2", t: "Pilih paket, sesi & lokasi", d: "Studio atau home service + data si kecil." },
  { n: "3", t: "Transfer DP & upload bukti", d: "Admin verifikasi, jadwal terkunci." },
];

export default async function HomePage() {
  const layanan = await getLayananDenganPaket();
  return (
    <PublicShell>
      <main>
        {/* Hero */}
        <section className="grad-soft relative overflow-hidden">
          <div className="orb -left-10 top-0 h-40 w-40 bg-pink-300" />
          <div className="orb -right-8 bottom-0 h-44 w-44 bg-emerald-200" />
          <div className="relative mx-auto max-w-3xl px-4 py-24 text-center sm:px-6">
            <span className="inline-block rounded-full bg-white px-3 py-1 text-xs font-bold shadow-sm">
              📷 Baby &amp; Kids Photo · {brand.kota}
            </span>
            <h1 className="mt-4 font-display text-5xl font-extrabold leading-tight">
              Abadikan momen <span className="text-grad">si kecil</span> ✨
            </h1>
            <p className="mt-3 font-semibold text-foreground/60">{brand.tagline}</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link href="#paket" className={btnGrad}>Lihat Paket</Link>
              <Link href="#galeri" className={btnOutline}>Lihat Galeri</Link>
            </div>
          </div>
        </section>

        <GalleryStrip />

        {/* Paket per layanan */}
        <section id="paket" className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
          <h2 className="font-display text-3xl font-extrabold">Pilih Layanan &amp; Paket</h2>
          <p className="mt-1 font-semibold text-foreground/50">Sesi foto untuk tiap momen si kecil.</p>
          {layanan.length === 0 && (
            <p className="mt-4 text-foreground/50">Belum ada paket. (Admin: tambahkan di Master.)</p>
          )}
          {layanan.map((l) => (
            <div key={l.id} className="mt-8">
              <h3 className={`text-sm font-extrabold uppercase tracking-wide ${AKSEN[l.nama.toLowerCase()] ?? "text-pink-500"}`}>{l.nama}</h3>
              <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {l.paket.map((p) => (
                  <div key={p.id} className="flex flex-col rounded-3xl bg-white p-5 shadow-sm transition hover:shadow-md glow-pink">
                    <div className="font-display text-lg font-bold">{p.nama}</div>
                    {p.deskripsi && <div className="mt-1 flex-1 text-sm text-foreground/55">{p.deskripsi}</div>}
                    <div className="mt-2 text-xs font-semibold text-foreground/45">±{p.durasi_menit} menit · DP {p.dp_persen}%</div>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="font-display text-xl font-extrabold text-pink-500">{formatRupiah(p.harga)}</span>
                      <Link href={`/paket/${p.id}`} className="rounded-full bg-grad px-5 py-2 text-sm font-bold text-white">Booking →</Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>

        {/* Cara Booking */}
        <section className="grad-soft">
          <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
            <h2 className="font-display text-3xl font-extrabold">Cara Booking</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              {LANGKAH.map((s) => (
                <div key={s.n} className="rounded-3xl bg-white/70 p-5">
                  <div className="grid h-9 w-9 place-items-center rounded-full bg-grad font-display font-bold text-white">{s.n}</div>
                  <div className="mt-3 font-bold">{s.t}</div>
                  <div className="mt-1 text-sm text-foreground/55">{s.d}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </PublicShell>
  );
}
