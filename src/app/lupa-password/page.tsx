import { kirimResetPassword } from "./actions";
import PublicShell from "@/components/public/PublicShell";
import { btnGrad } from "@/components/ui/buttons";
import SubmitButton from "@/components/ui/SubmitButton";

const inputCls = "rounded-xl bg-cream px-4 py-3 text-sm ring-1 ring-black/5 placeholder-foreground/40";

export default function LupaPasswordPage() {
  return (
    <PublicShell>
      <main className="grad-soft min-h-[70vh]">
        <div className="mx-auto w-full max-w-md px-4 py-12 sm:px-6">
          <h1 className="font-display text-2xl font-extrabold">Lupa Password</h1>
          <p className="mt-1 text-sm font-semibold text-foreground/55">
            Masukkan email akunmu. Kami kirim link untuk mengatur ulang password.
          </p>
          <form action={kirimResetPassword} className="mt-4 flex flex-col gap-3">
            <input name="email" type="email" placeholder="Email" className={inputCls} required />
            <SubmitButton className={`${btnGrad} w-full`} pendingText="Mengirim…">Kirim Link Reset</SubmitButton>
          </form>
          <p className="mt-3 text-sm font-semibold text-foreground/60">
            Ingat password? <a className="text-grad font-bold" href="/login">Masuk</a>
          </p>
        </div>
      </main>
    </PublicShell>
  );
}
