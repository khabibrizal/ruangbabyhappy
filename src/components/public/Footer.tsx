import { brand } from "@/lib/brand";

export default function Footer() {
  return (
    <footer className="mt-auto bg-white px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="overflow-hidden rounded-2xl ring-1 ring-black/10">
          <iframe src={brand.mapsEmbed} className="h-40 w-full" loading="lazy" />
        </div>
        <p className="mt-3 text-sm font-semibold text-foreground/70">{brand.alamat}</p>
        <div className="mt-2 flex gap-4 text-sm font-bold">
          <a href={brand.igUrl} className="text-pink-500" target="_blank" rel="noreferrer">📷 @{brand.ig}</a>
        </div>
        <p className="mt-4 text-xs text-foreground/40">© 2026 {brand.nama}</p>
      </div>
    </footer>
  );
}
