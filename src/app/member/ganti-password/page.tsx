import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { gantiPassword } from "./actions";
import { btnGrad } from "@/components/ui/buttons";
import SubmitButton from "@/components/ui/SubmitButton";

export const dynamic = "force-dynamic";
const inp = "mt-1 block w-full rounded-xl bg-white px-4 py-3 text-sm ring-1 ring-black/10";

export default async function GantiPasswordPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login?next=/member/ganti-password");

  return (
    <main className="mx-auto w-full max-w-md px-4 py-10 sm:px-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-extrabold">Ganti Password</h1>
        <Link href="/member" className="text-sm text-slate-500 underline">← Member</Link>
      </div>
      <form action={gantiPassword} className="mt-4 flex flex-col gap-3">
        <label className="text-sm font-bold">Password lama
          <input name="lama" type="password" required className={inp} autoComplete="current-password" />
        </label>
        <label className="text-sm font-bold">Password baru
          <input name="baru" type="password" required minLength={8} className={inp} autoComplete="new-password" />
        </label>
        <label className="text-sm font-bold">Konfirmasi password baru
          <input name="konfirmasi" type="password" required minLength={8} className={inp} autoComplete="new-password" />
        </label>
        <p className="text-xs text-foreground/45">Minimal 8 karakter.</p>
        <SubmitButton className={`${btnGrad} w-full`} pendingText="Menyimpan…">Simpan Password</SubmitButton>
      </form>
    </main>
  );
}
