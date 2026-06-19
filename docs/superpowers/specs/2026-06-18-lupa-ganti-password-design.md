# Desain: Lupa Password + Ganti Password

**Tanggal:** 2026-06-18
**App:** Ruang Baby Happy (Next.js 16 + Supabase Auth)

## Tujuan
Member bisa (A) ganti password saat login, (B) reset password sendiri via email
bila lupa, dan (C) — sebagai cadangan — admin bisa reset password customer.

## A. Ganti Password (member login) — `/member/ganti-password`
Form: password lama, baru, konfirmasi. Server action: verifikasi password lama via
`signInWithPassword` (email dari sesi), lalu `updateUser({ password })`. Redirect ke
`/member?ok=...`. Link "Ganti Password" di header member. Tanpa email. Redirect ke
`/login` bila belum login.

## B. Lupa Password (email self-service)
- `/lupa-password` → form email → action `kirimResetPassword`:
  `resetPasswordForEmail(email, { redirectTo: ${SITE_URL}/auth/callback?next=/reset-password })`.
  Selalu tampilkan pesan generik "jika email terdaftar, link reset telah dikirim"
  (anti email-enumeration).
- `/auth/callback` (route handler GET) → `exchangeCodeForSession(code)` (set cookie
  sesi recovery) → redirect ke `next` (default `/reset-password`). Bila tak ada code
  / gagal → redirect `/lupa-password?error=...`.
- `/reset-password` (server component) → cek sesi (`getUser`). Ada sesi → form
  password baru + konfirmasi → action `setPasswordBaru` → `updateUser({ password })`
  → redirect `/member?ok=...`. Tak ada sesi → pesan "link tidak valid/kadaluarsa,
  minta ulang".
- Link **"Lupa password?"** di `/login`.
- **Konfigurasi Supabase (di luar kode, dilakukan user):** SMTP (mis. Resend) +
  Redirect URL allowlist (`https://www.ruangbabyhappy.web.id/**`, `localhost:3000/**`).
  Tanpa ini email tak terkirim; A & C tetap jalan.

## C. Reset via Admin (backup) — di `/admin/master/customer/[id]`
Kartu "Reset Password" → input password baru → action `resetPasswordCustomer`:
`admin.auth.admin.updateUserById(id, { password })`. Guard: customer legacy tanpa
auth user → pesan "customer belum punya akun login". guardAdmin.

## Lintas-fitur
- Helper murni `validasiPassword(baru, konfirmasi)` (min 8, sama) → string error|null.
  Unit-tested.
- Halaman auth baru (`/lupa-password`, `/reset-password`) di-`noindex` (layout
  metadata robots, pola sama login/member).
- Feedback via FlashToast global (`?ok`/`?error`).

## File
- `src/lib/auth/password.ts` (+ `tests/unit/password.test.ts`)
- `src/app/lupa-password/{layout,page,actions}.tsx`
- `src/app/reset-password/{layout,page,actions}.tsx`
- `src/app/auth/callback/route.ts`
- `src/app/member/ganti-password/{page,actions}.tsx`
- edit: `src/lib/admin/customerSearch.ts`, `src/app/admin/master/customer/[id]/page.tsx`,
  `src/app/login/page.tsx`, `src/app/member/page.tsx`

## Testing
Unit `validasiPassword`; build hijau; manual: ganti password & admin-reset jalan tanpa
email; email-reset jalan setelah SMTP dikonfigurasi.

## YAGNI
- Tanpa 2FA, tanpa kebijakan kompleksitas password lanjut, tanpa "ingat sesi" khusus.
- Tanpa migration DB.
