import Image from "next/image";
import { brand } from "@/lib/brand";
import { getGaleri } from "@/lib/gallery/queries";

export default async function GalleryStrip() {
  const rows = await getGaleri();
  if (rows.length === 0) return null;
  return (
    <section id="galeri" className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <h2 className="mb-5 font-display text-2xl font-extrabold">Galeri <span className="text-grad">💕</span></h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {rows.map((g, i) => (
          <div key={g.id} className="relative aspect-[3/4] overflow-hidden rounded-2xl">
            <Image src={g.url} alt={`Galeri ${brand.nama} ${i + 1}`} fill className="object-cover" sizes="(max-width: 640px) 50vw, 25vw" />
          </div>
        ))}
        <a href={brand.igUrl} target="_blank" rel="noopener noreferrer"
          className="grid aspect-[3/4] place-items-center rounded-2xl bg-grad p-4 text-center font-bold text-white">
          Lihat semua di IG →
        </a>
      </div>
    </section>
  );
}
