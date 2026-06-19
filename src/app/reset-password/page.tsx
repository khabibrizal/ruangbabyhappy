import { setPasswordBaru } from "./actions";
import PublicShell from "@/components/public/PublicShell";
import { btnGrad } from "@/components/ui/buttons";
import SubmitButton from "@/components/ui/SubmitButton";

export const dynamic = "force-dynamic";
const inputCls = "rounded-xl bg-cream px-4 py-3 text-sm ring-1 ring-black/5 placeholder-foreground/40";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email = "" } = await searchParams;

  return (
    <PublicShell>
      <main className="grad-soft min-h-[70vh]">
        <div className="mx-auto w-full max-w-md px-4 py-12 sm:px-6">
          <h1 className="font-display text-2xl font-extrabold">Atur Ulang Password</h1>
          <p className="mt-1 text-sm font-semibold text-foreground/55">
            Masukkan <b>kode 6 digit</b> yang dikirim ke emailmu, lalu password baru. (Cek inbox & folder spam.)
          </p>
          <form action={setPasswordBaru} className="mt-4 flex flex-col gap-3">
            <input name="email" type="email" defaultValue={email} placeholder="Email" required className={inputCls} />
            <input
              name="kode"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="Kode 6 digit"
              required
              className={`${inputCls} tracking-widest`}
            />
            <input name="baru" type="password" placeholder="Password baru" minLength={8} required className={inputCls} autoComplete="new-password" />
            <input name="konfirmasi" type="password" placeholder="Konfirmasi password baru" minLength={8} required className={inputCls} autoComplete="new-password" />
            <p className="text-xs text-foreground/45">Password minimal 8 karakter.</p>
            <SubmitButton className={`${btnGrad} w-full`} pendingText="Menyimpan…">Simpan Password Baru</SubmitButton>
          </form>
          <p className="mt-3 text-sm font-semibold text-foreground/60">
            Belum dapat kode? <a className="text-grad font-bold" href="/lupa-password">Kirim ulang</a>
          </p>
        </div>
      </main>
    </PublicShell>
  );
}
