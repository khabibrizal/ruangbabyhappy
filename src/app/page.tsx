import Link from "next/link";
import PublicShell from "@/components/public/PublicShell";
import { brand } from "@/lib/brand";
import { btnGrad, btnOutline } from "@/components/ui/buttons";

export default function HomePage() {
  return (
    <PublicShell>
      <main className="grad-soft">
        <section className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
          <span className="inline-block rounded-full bg-white px-3 py-1 text-xs font-bold shadow-sm">
            📷 Baby &amp; Kids Photo · {brand.kota}
          </span>
          <h1 className="mt-4 font-display text-4xl font-extrabold leading-tight">
            Abadikan momen <span className="text-grad">si kecil</span> ✨
          </h1>
          <p className="mt-3 font-semibold text-foreground/60">{brand.tagline}</p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/register" className={btnGrad}>Booking Sekarang</Link>
            <Link href="/login" className={btnOutline}>Masuk</Link>
          </div>
        </section>
      </main>
    </PublicShell>
  );
}
