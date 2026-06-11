import Link from "next/link";
import { brand } from "@/lib/brand";
import { btnGradSm, btnOutlineSm } from "@/components/ui/buttons";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-20 bg-white/80 backdrop-blur">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="font-display text-lg font-extrabold">
          Ruang Baby<span className="text-grad">Happy</span>
        </Link>
        <div className="flex gap-2">
          <Link href="/login" className={btnOutlineSm}>Masuk</Link>
          <Link href="/register" className={btnGradSm}>Daftar</Link>
        </div>
      </nav>
    </header>
  );
}
