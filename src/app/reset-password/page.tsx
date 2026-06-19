import { createClient } from "@/lib/supabase/server";
import { setPasswordBaru } from "./actions";
import PublicShell from "@/components/public/PublicShell";
import { btnGrad } from "@/components/ui/buttons";
import SubmitButton from "@/components/ui/SubmitButton";

export const dynamic = "force-dynamic";
const inputCls = "rounded-xl bg-cream px-4 py-3 text-sm ring-1 ring-black/5 placeholder-foreground/40";

export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <PublicShell>
      <main className="grad-soft min-h-[70vh]">
        <div className="mx-auto w-full max-w-md px-4 py-12 sm:px-6">
          <h1 className="font-display text-2xl font-extrabold">Atur Ulang Password</h1>
          {!user ? (
            <div className="mt-3 rounded-xl bg-white p-4 text-sm ring-1 ring-black/5">
              <p className="font-semibold text-foreground/70">Link tidak valid atau sudah kadaluarsa.</p>
              <a href="/lupa-password" className="mt-2 inline-block text-grad font-bold">Minta link reset lagi</a>
            </div>
          ) : (
            <form action={setPasswordBaru} className="mt-4 flex flex-col gap-3">
              <input name="baru" type="password" placeholder="Password baru" minLength={8} required className={inputCls} autoComplete="new-password" />
              <input name="konfirmasi" type="password" placeholder="Konfirmasi password baru" minLength={8} required className={inputCls} autoComplete="new-password" />
              <p className="text-xs text-foreground/45">Minimal 8 karakter.</p>
              <SubmitButton className={`${btnGrad} w-full`} pendingText="Menyimpan…">Simpan Password Baru</SubmitButton>
            </form>
          )}
        </div>
      </main>
    </PublicShell>
  );
}
