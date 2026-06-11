import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { btnGradSm, btnOutlineSm } from "@/components/ui/buttons";

export default async function Navbar() {
  const profile = await getCurrentProfile();
  return (
    <header className="sticky top-0 z-20 bg-white/80 backdrop-blur">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="font-display text-lg font-extrabold">
          Ruang Baby<span className="text-grad">Happy</span>
        </Link>
        <div className="flex items-center gap-2">
          {profile ? (
            <>
              <span className="hidden text-sm font-bold text-foreground/70 sm:inline">Hi, {profile.nama ?? "Member"}</span>
              {profile.role === "admin" ? (
                <Link href="/admin" className={btnOutlineSm}>Admin</Link>
              ) : (
                <Link href="/member" className={btnOutlineSm}>Transaksi</Link>
              )}
              <form action="/logout" method="post">
                <button className={btnGradSm}>Keluar</button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className={btnOutlineSm}>Masuk</Link>
              <Link href="/register" className={btnGradSm}>Daftar</Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
