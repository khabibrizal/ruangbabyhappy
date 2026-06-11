import { login } from "./actions";
import PublicShell from "@/components/public/PublicShell";
import { btnGrad } from "@/components/ui/buttons";

const inputCls = "rounded-xl bg-cream px-4 py-3 text-sm ring-1 ring-black/5 placeholder-foreground/40";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;
  return (
    <PublicShell>
      <main className="grad-soft min-h-[70vh]">
        <div className="mx-auto w-full max-w-md px-4 py-12 sm:px-6">
          <h1 className="font-display text-2xl font-extrabold">Masuk</h1>
          {error && (
            <p className="mt-3 rounded-lg bg-red-100 p-2 text-sm font-semibold text-red-600">{error}</p>
          )}
          <form action={login} className="mt-4 flex flex-col gap-3">
            <input type="hidden" name="next" value={next ?? ""} />
            <input name="email" type="email" placeholder="Email" className={inputCls} required />
            <input name="password" type="password" placeholder="Password" className={inputCls} required />
            <button className={`${btnGrad} w-full`}>Masuk</button>
          </form>
          <p className="mt-3 text-sm font-semibold text-foreground/60">
            Belum punya akun? <a className="text-grad font-bold" href="/register">Daftar</a>
          </p>
        </div>
      </main>
    </PublicShell>
  );
}
