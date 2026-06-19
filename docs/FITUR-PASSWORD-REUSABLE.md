# Fitur Lupa Password + Ganti Password (Reusable Guide)

Panduan **siap-pakai-ulang** untuk fitur:
- **A. Ganti Password** (user login)
- **B. Lupa Password** (self-service via **KODE 6-digit**, bukan magic-link)
- **C. Reset Password oleh Admin** (cadangan, tanpa email)

Stack acuan: **Next.js (App Router) + TypeScript + Supabase Auth (`@supabase/ssr`)**.
Diambil dari implementasi Ruang Baby Happy yang sudah jalan di produksi.

> **Kenapa KODE 6-digit, bukan magic-link?** Magic-link sering kena `otp_expired`
> ("Email link is invalid or has expired") karena **pemindai email** (Gmail/antivirus)
> mengeklik link lebih dulu sehingga token sekali-pakai habis sebelum user klik.
> Magic-link juga rapuh: harus matching Redirect URL persis (termasuk www vs non-www),
> butuh cookie PKCE (gagal lintas-perangkat). **Metode kode** mengetik 6 digit — tanpa
> link sama sekali — jadi kebal semua masalah itu.

---

## 0. Dependensi yang diasumsikan

Sesuaikan ke project-mu:
- **Supabase clients** (`@supabase/ssr`):
  - `@/lib/supabase/server` → `createClient()` (server, cookie-based, untuk sesi user)
  - `@/lib/supabase/admin` → `createAdminClient()` (service-role, untuk admin reset)
- **`getCurrentProfile()`** → ambil user/profil yang login (atau cek `supabase.auth.getUser()`).
- Komponen UI project (ganti sesuai punyamu): `PublicShell`, `SubmitButton`, `btnGrad`, kelas input.
- **Toast `?ok`/`?error`** global (opsional) untuk feedback redirect.

---

## 1. Konfigurasi Supabase (WAJIB untuk bagian B)

> Lakukan di **project Supabase yang BENAR** (cek project ref di dashboard cocok dgn
> `NEXT_PUBLIC_SUPABASE_URL` di `.env`). Salah satu jebakan tersering: mengedit
> project yang salah saat punya >1 project.

### 1a. SMTP (agar email andal)
**Authentication → Emails → SMTP Settings** → Enable Custom SMTP. Contoh Resend:
- Host `smtp.resend.com`, Port `465`, Username `resend`, Password = **API key Resend**
  (key milik akun Resend, bisa dipakai ulang lintas project), Sender
  `noreply@domainmu`, Sender name brand.
- Domain pengirim harus **Verified** di Resend (tambah DKIM/SPF di DNS).
- Email bawaan Supabase boleh untuk uji coba, tapi **rate-limited (~3–4/jam)** →
  sering bikin user mengeklik link/kode lama yang kedaluwarsa.

### 1b. Template email "Reset Password"
**Authentication → Emails → Templates → Reset Password** → ganti Body agar menampilkan
**`{{ .Token }}`** (kode 6-digit), bukan link:
```html
<h2>Reset Password</h2>
<p>Masukkan kode berikut di halaman reset password:</p>
<p style="font-size:28px;font-weight:bold;letter-spacing:4px;margin:16px 0">{{ .Token }}</p>
<p>Kode berlaku 1 jam. Abaikan email ini jika kamu tidak meminta reset.</p>
```
> `{{ .Token }}` = OTP numerik yang diverifikasi `verifyOtp({ type: "recovery" })`.

### 1c. URL Configuration
Untuk metode kode, **Redirect URL tidak krusial**. Cukup set **Site URL** ke domain
produksimu. (Kalau suatu saat balik ke magic-link, baru Redirect URL penting & harus
cocok persis termasuk www.)

---

## 2. Helper validasi (murni, bisa di-unit-test)

`src/lib/auth/password.ts`
```ts
export const MIN_PASSWORD = 8;

/** Validasi password baru + konfirmasi. Kembalikan pesan error, atau null bila valid. */
export function validasiPassword(baru: string, konfirmasi: string): string | null {
  if (!baru || baru.length < MIN_PASSWORD) return `Password minimal ${MIN_PASSWORD} karakter`;
  if (baru !== konfirmasi) return "Konfirmasi password tidak cocok";
  return null;
}
```

---

## 3. Bagian A — Ganti Password (user login)

`src/app/member/ganti-password/actions.ts`
```ts
"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { validasiPassword } from "@/lib/auth/password";

export async function gantiPassword(formData: FormData) {
  const lama = String(formData.get("lama") ?? "");
  const baru = String(formData.get("baru") ?? "");
  const konfirmasi = String(formData.get("konfirmasi") ?? "");
  const back = (m: string) => redirect(`/member/ganti-password?error=${encodeURIComponent(m)}`);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) redirect("/login?next=/member/ganti-password");

  const v = validasiPassword(baru, konfirmasi);
  if (v) back(v);

  // Verifikasi password lama dulu (cegah ganti tanpa tahu password saat ini).
  const { error: errLama } = await supabase.auth.signInWithPassword({ email: user!.email, password: lama });
  if (errLama) back("Password lama salah");

  const { error } = await supabase.auth.updateUser({ password: baru });
  if (error) back(error.message);

  redirect(`/member?ok=${encodeURIComponent("Password berhasil diganti")}`);
}
```

`src/app/member/ganti-password/page.tsx`
```tsx
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
        <SubmitButton className={`${btnGrad} w-full`} pendingText="Menyimpan…">Simpan Password</SubmitButton>
      </form>
    </main>
  );
}
```
Tambahkan link **"Ganti Password"** ke header area member (`<Link href="/member/ganti-password">`).

---

## 4. Bagian B — Lupa Password (KODE 6-digit)

**Alur:** `/lupa-password` (isi email → kirim kode) → `/reset-password?email=…`
(ketik kode + password baru → `verifyOtp` → `updateUser`).

`src/app/lupa-password/actions.ts`
```ts
"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function kirimResetPassword(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) redirect(`/lupa-password?error=${encodeURIComponent("Email wajib diisi")}`);

  const supabase = await createClient();
  // Memicu email recovery berisi KODE 6-digit ({{ .Token }} di template).
  await supabase.auth.resetPasswordForEmail(email);

  // Anti email-enumeration: selalu lanjut ke halaman isi kode.
  redirect(`/reset-password?email=${encodeURIComponent(email)}`);
}
```

`src/app/reset-password/actions.ts`
```ts
"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { validasiPassword } from "@/lib/auth/password";

export async function setPasswordBaru(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const kode = String(formData.get("kode") ?? "").trim();
  const baru = String(formData.get("baru") ?? "");
  const konfirmasi = String(formData.get("konfirmasi") ?? "");
  const back = (m: string) =>
    redirect(`/reset-password?email=${encodeURIComponent(email)}&error=${encodeURIComponent(m)}`);

  if (!email || !kode) back("Email & kode wajib diisi");
  const v = validasiPassword(baru, konfirmasi);
  if (v) back(v);

  const supabase = await createClient();
  // Verifikasi kode recovery → membuat sesi bila valid.
  const { error: vErr } = await supabase.auth.verifyOtp({ email, token: kode, type: "recovery" });
  if (vErr) back("Kode salah atau kedaluwarsa. Minta kode baru.");

  const { error } = await supabase.auth.updateUser({ password: baru });
  if (error) back(error.message);

  redirect(`/member?ok=${encodeURIComponent("Password berhasil diatur ulang")}`);
}
```

`src/app/lupa-password/page.tsx`
```tsx
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
            Masukkan email akunmu. Kami kirim kode untuk mengatur ulang password.
          </p>
          <form action={kirimResetPassword} className="mt-4 flex flex-col gap-3">
            <input name="email" type="email" placeholder="Email" className={inputCls} required />
            <SubmitButton className={`${btnGrad} w-full`} pendingText="Mengirim…">Kirim Kode</SubmitButton>
          </form>
          <p className="mt-3 text-sm font-semibold text-foreground/60">
            Ingat password? <a className="text-grad font-bold" href="/login">Masuk</a>
          </p>
        </div>
      </main>
    </PublicShell>
  );
}
```

`src/app/reset-password/page.tsx`
```tsx
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
            Masukkan <b>kode 6 digit</b> dari email, lalu password baru. (Cek inbox & spam.)
          </p>
          <form action={setPasswordBaru} className="mt-4 flex flex-col gap-3">
            <input name="email" type="email" defaultValue={email} placeholder="Email" required className={inputCls} />
            <input name="kode" inputMode="numeric" autoComplete="one-time-code" placeholder="Kode 6 digit" required className={`${inputCls} tracking-widest`} />
            <input name="baru" type="password" placeholder="Password baru" minLength={8} required className={inputCls} autoComplete="new-password" />
            <input name="konfirmasi" type="password" placeholder="Konfirmasi password baru" minLength={8} required className={inputCls} autoComplete="new-password" />
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
```

`layout.tsx` (noindex) — taruh di folder `lupa-password/` dan `reset-password/`:
```tsx
import type { Metadata } from "next";
export const metadata: Metadata = { robots: { index: false, follow: false } };
export default function NoindexLayout({ children }: { children: React.ReactNode }) {
  return children;
}
```

Tambahkan link **"Lupa password?"** (`<a href="/lupa-password">`) di halaman login.

---

## 5. Bagian C — Reset Password oleh Admin (cadangan, tanpa email)

Server action (service-role). `id` = id auth user (= id profil untuk user terdaftar).
```ts
"use server";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { MIN_PASSWORD } from "@/lib/auth/password";

export async function resetPasswordCustomer(formData: FormData) {
  const me = await getCurrentProfile();
  if (me?.role !== "admin") throw new Error("forbidden");
  const id = String(formData.get("id") ?? "").trim();
  const baru = String(formData.get("password") ?? "");
  if (!id) redirect(`/admin/...?error=Customer tidak valid`);
  if (baru.length < MIN_PASSWORD) redirect(`/admin/.../${id}?error=Password minimal ${MIN_PASSWORD} karakter`);

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(id, { password: baru });
  // user "legacy" tanpa auth user → updateUserById gagal "user not found".
  if (error) redirect(`/admin/.../${id}?error=Customer belum punya akun login`);
  redirect(`/admin/.../${id}?ok=Password customer berhasil direset`);
}
```
Form: input password (+ hidden `id`) → submit ke action di atas.

---

## 6. Testing

Unit (vitest) untuk helper murni:
```ts
import { describe, it, expect } from "vitest";
import { validasiPassword } from "@/lib/auth/password";

describe("validasiPassword", () => {
  it("tolak <8", () => expect(validasiPassword("123", "123")).toMatch(/minimal 8/));
  it("tolak tidak cocok", () => expect(validasiPassword("rahasia12", "beda9999")).toMatch(/tidak cocok/));
  it("lolos", () => expect(validasiPassword("rahasia12", "rahasia12")).toBeNull());
});
```
Manual: A & C jalan tanpa email; B perlu SMTP + template `{{ .Token }}` → request di
`/lupa-password`, kode masuk email, isi di `/reset-password`.

---

## 7. Troubleshooting (jebakan nyata)

| Gejala | Sebab & solusi |
|---|---|
| `otp_expired` walau link/kode fresh | Magic-link dikonsumsi pemindai email **atau** email bawaan rate-limited (klik email lama). → Pakai **KODE** (panduan ini) + SMTP sendiri. |
| Email reset masih berformat **link** | Template "Reset Password" belum diubah ke `{{ .Token }}`, **belum di-Save**, atau kamu membuka **email lama** (Gmail menggabungkan subjek sama — buka pesan terbaru). |
| Klik link nyasar ke **home** | (mode link) Redirect URL tidak cocok (mis. www vs non-www) → Supabase fallback ke Site URL. Metode kode tidak kena ini. |
| Setting "tidak ngefek" | Kamu mengedit **project Supabase yang salah**. Pastikan project ref = `NEXT_PUBLIC_SUPABASE_URL`. |
| Email tak terkirim sama sekali | SMTP belum aktif di project itu / domain Resend belum Verified. |
| Admin reset gagal "user not found" | Customer belum punya akun auth (data legacy). Minta user daftar dulu. |

---

## 8. Checklist implementasi cepat

- [ ] `lib/auth/password.ts` + unit test
- [ ] A: `member/ganti-password/{actions,page}.tsx` + link di header member
- [ ] B: `lupa-password/{actions,page,layout}.tsx` + `reset-password/{actions,page,layout}.tsx` + link "Lupa password?" di login
- [ ] C: action `resetPasswordCustomer` + form di halaman admin customer
- [ ] Supabase: SMTP aktif + template Reset Password `{{ .Token }}` + Site URL benar
- [ ] Tes A & C (tanpa email), lalu B (dengan email kode)
