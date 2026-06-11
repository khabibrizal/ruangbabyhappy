import { register } from "./actions";
import PublicShell from "@/components/public/PublicShell";
import { btnGrad } from "@/components/ui/buttons";
import SubmitButton from "@/components/ui/SubmitButton";

const inputCls = "rounded-xl bg-cream px-4 py-3 text-sm ring-1 ring-black/5 placeholder-foreground/40";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <PublicShell>
      <main className="grad-soft min-h-[70vh]">
        <div className="mx-auto w-full max-w-md px-4 py-12 sm:px-6">
          <h1 className="font-display text-2xl font-extrabold">Daftar Akun 🎀</h1>
          <p className="mt-1 text-sm font-semibold text-foreground/55">Booking wajib punya akun untuk tracking pesanan.</p>
          {error && (
            <p className="mt-3 rounded-lg bg-red-100 p-2 text-sm font-semibold text-red-600">{error}</p>
          )}
          <form action={register} className="mt-4 flex flex-col gap-3">
            <input name="nama" placeholder="Nama lengkap" className={inputCls} required />
            <input name="no_wa" placeholder="No. WhatsApp" className={inputCls} />
            <input name="alamat" placeholder="Alamat" className={inputCls} />
            <input name="email" type="email" placeholder="Email" className={inputCls} required />
            <input name="password" type="password" placeholder="Password" className={inputCls} required />
            <SubmitButton className={`${btnGrad} w-full`} pendingText="Mendaftar…">Buat Akun</SubmitButton>
          </form>
          <p className="mt-3 text-sm font-semibold text-foreground/60">
            Sudah punya akun? <a className="text-grad font-bold" href="/login">Masuk</a>
          </p>
        </div>
      </main>
    </PublicShell>
  );
}
