# Ruang Baby Happy — Plan 5: Desain "Baby Happy" (Tampilan Publik)

> Presentasi saja (markup + style); TIDAK mengubah logika/alur. Pertahankan anchor smoke test: heading memuat "si kecil" + ada link "Lihat Paket".

**Goal:** Mempercantik halaman publik agar pastel & playful sesuai mockup: hero berhias orb, section **Cara Booking** 3 langkah, kartu paket per layanan dengan aksen warna, dan **Footer** dengan peta klik→rute + IG + WhatsApp + alamat.

**Scope:** `src/app/globals.css` (+utilities), `src/components/public/Footer.tsx` (rewrite), `src/app/page.tsx` (rewrite landing). Auth/booking/konfirmasi sudah bertema (tak disentuh). Admin/member tetap terang-fungsional.

**Prasyarat:** Plan 6 selesai (commit ...3a982db).

---

## Task 1: Utilities globals + Footer

- [ ] **Step 1: Tambah utilities di akhir `src/app/globals.css`**

```css
/* Orb dekoratif (lingkaran blur lembut di hero) */
.orb { position: absolute; border-radius: 9999px; filter: blur(40px); opacity: 0.45; pointer-events: none; }
.glow-pink { box-shadow: 0 20px 60px -20px rgba(236, 72, 153, 0.45); }
```

- [ ] **Step 2: Ganti seluruh `src/components/public/Footer.tsx`**

```tsx
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
```

- [ ] **Step 3: Commit** — `git add src/app/globals.css src/components/public/Footer.tsx && git commit -m "design(plan5): utilities orb + Footer (peta klik-rute, IG, WA)"`

---

## Task 2: Landing redesign

- [ ] **Step 1: Ganti seluruh `src/app/page.tsx`** (hero berhias + Cara Booking + kartu paket beraksen; pertahankan "si kecil" & "Lihat Paket")

```tsx
import Link from "next/link";
import PublicShell from "@/components/public/PublicShell";
import { brand } from "@/lib/brand";
import { btnGrad, btnOutline } from "@/components/ui/buttons";
import { getLayananDenganPaket } from "@/lib/catalog/queries";
import { formatRupiah } from "@/lib/format/rupiah";
import GalleryStrip from "@/components/public/GalleryStrip";

export const dynamic = "force-dynamic";

const AKSEN: Record<string, string> = {
  newborn: "text-pink-500", cakesmash: "text-orange-500", maternity: "text-emerald-500", sitter: "text-sky-500",
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
          <div className="orb -left-10 top-0 h-40 w-40 bg-babypink" />
          <div className="orb -right-8 bottom-0 h-44 w-44 bg-babymint" />
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
```

> Catatan: `bg-babypink`/`bg-babymint` sudah terdefinisi di `tailwind.config`/globals (Plan 1). Bila warna orb tak muncul, ganti ke `bg-pink-300`/`bg-emerald-200`.

- [ ] **Step 2: Commit** — `git add src/app/page.tsx && git commit -m "design(plan5): landing hero berhias + Cara Booking + kartu paket beraksen"`

---

## Task 3: Verifikasi
- [ ] Build hijau (`npm run build`, ulangi bila Turbopack timeout).
- [ ] E2E `npm run test:e2e -- smoke plan6` hijau (heading "si kecil" + link "Lihat Paket" + navbar/menu tetap).

## Self-Review
- Tema pastel publik diperkaya (hero orbs, Cara Booking, kartu beraksen, Footer peta-rute+IG+WA) tanpa ubah logika ✓.
- Anchor smoke dipertahankan ("si kecil", "Lihat Paket") ✓.
- Brand placeholder (alamat/koordinat/IG) tetap — user isi nilai final nanti ✓.
