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

## B. Lupa Password (email self-service — metode KODE 6-digit)
Memakai **OTP code**, BUKAN magic-link — kebal pemindai link email (yang sering
mengonsumsi token sekali-pakai → `otp_expired`), lintas-perangkat, tak butuh
matching redirect URL.
- `/lupa-password` → form email → action `kirimResetPassword`:
  `resetPasswordForEmail(email)` (memicu email berisi `{{ .Token }}` = kode 6-digit)
  → redirect `/reset-password?email=<email>`.
- `/reset-password` (form, tanpa sesi) → field: email (prefilled), kode 6-digit,
  password baru, konfirmasi → action `setPasswordBaru`:
  `verifyOtp({ email, token: kode, type: "recovery" })` (membuat sesi bila valid)
  → `updateUser({ password })` → redirect `/member?ok=...`. Kode salah/expired →
  pesan error.
- Link **"Lupa password?"** di `/login`.
- **Konfigurasi Supabase (user):** (1) SMTP (mis. Resend) di project yg benar
  (`tcvsgmtvtveaqjmehqpu`) agar email andal; (2) **edit template email "Reset
  Password"** untuk menampilkan `{{ .Token }}` (kode), bukan hanya link. Redirect URL
  TIDAK lagi krusial utk metode kode. A & C tetap jalan tanpa SMTP.

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
