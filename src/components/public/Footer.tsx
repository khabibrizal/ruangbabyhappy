import { brand } from "@/lib/brand";
import { normalisasiWa } from "@/lib/booking/waLink";

export default function Footer() {
  const wa = normalisasiWa(process.env.NEXT_PUBLIC_ADMIN_WA ?? "");
  return (
    <footer className="mt-auto bg-white px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <h2 className="font-display text-xl font-extrabold">Kunjungi Kami 📍</h2>
        <div className="relative mt-3 overflow-hidden rounded-3xl ring-1 ring-black/10">
          <iframe src={brand.mapsEmbed} className="pointer-events-none h-48 w-full" loading="lazy" title="Peta lokasi" />
          <a href={brand.mapsDir} target="_blank" rel="noreferrer" className="absolute inset-0" aria-label="Buka rute ke lokasi" />
        </div>
        <p className="mt-3 text-sm font-semibold text-foreground/70">{brand.alamat}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <a href={brand.igUrl} target="_blank" rel="noreferrer" className="rounded-full bg-pink-50 px-4 py-2 text-sm font-bold text-pink-600 ring-1 ring-pink-200">📷 @{brand.ig}</a>
          {wa && <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" className="rounded-full bg-green-50 px-4 py-2 text-sm font-bold text-green-600 ring-1 ring-green-200">💬 WhatsApp</a>}
        </div>
        <p className="mt-6 text-xs text-foreground/40">© 2026 {brand.nama} · {brand.tagline}</p>
      </div>
    </footer>
  );
}
