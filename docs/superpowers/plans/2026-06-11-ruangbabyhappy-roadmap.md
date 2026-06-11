# Ruang Baby Happy — Roadmap Implementasi (5 Plan Bertahap)

> Spec: [`../specs/2026-06-11-ruangbabyhappy-booking-design.md`](../specs/2026-06-11-ruangbabyhappy-booking-design.md) · Mockup: [`../../mockups/index.html`](../../mockups/index.html)
> Basis arsitektur: fork **booking-studio** (`d:\booking-studio`) — Next.js 16 + React 19 + Supabase + Tailwind v4 + Vitest + Playwright.

Setiap plan menghasilkan software yang jalan & teruji sendiri. Plan ditulis **just-in-time**: plan berikutnya difinalkan setelah plan sebelumnya dieksekusi (karena kodenya bergantung pada file yang dibuat tahap sebelumnya).

| Plan | Fokus | Output yang jalan |
|---|---|---|
| **1 · Foundation** | Scaffold project, config, Supabase clients, **skema DB `0001`+RLS `0002`+RPC `0003`**, auth (register/login/logout) member-only, proxy gate, brand+tema dasar, landing shell | App jalan; bisa daftar/login; `/admin` & `/member` ter-gate; DB siap |
| **2 · Katalog + Sesi + Zona + Master** | Master `layanan/paket/sesi/zona_ongkos/blackout`, query katalog (paket per layanan), helper `getSesiTersedia` (kapasitas per layanan), admin master CRUD | Landing menampilkan paket per layanan; admin kelola master; ketersediaan sesi terhitung |
| **3 · Booking + Bayar + Ongkos + Diskon** | Form booking (wajib login, field anak, lokasi/zona/alamat, upload bukti), fungsi murni `hitungTagihan`/`hitungDp`/`hitungDiskon`, `buatBooking`, halaman konfirmasi `/booking/[kode]`, routing WA per layanan | Member bisa booking end-to-end + lihat rincian total & DP 30% |
| **4 · Admin Transaksi + Invoice + Status Pengerjaan** | Daftar & detail transaksi (override ongkos/diskon, Set Lunas, reschedule), `set_payment_lunas`, status pengerjaan (admin set), invoice PDF, dashboard member + **stepper**, laporan+CSV | Admin verifikasi bayar, atur status; member tracking; invoice PDF |
| **5 · Desain "Baby Happy"** | Tema pastel penuh (globals, PublicShell/Navbar/Footer, GradientButton), restyle landing/paket/booking/auth, kelompok paket per layanan, optimasi gambar galeri | Tampilan publik final sesuai mockup |

**Keputusan terkunci** (dari spec): wajib login (tanpa visitor) · 2 sesi/hari kapasitas **per layanan** · field anak (nama/BB/JK) · home service ongkos berbasis **zona** (master, admin-override) · **DP = `package.dp_persen`% default 30%** atas (paket+ongkos−diskon) · status pengerjaan 5 tahap (`pilih_foto→edit→cetak→pengiriman→selesai`, NULL=belum mulai) · routing WA per layanan (`layanan.admin_wa`).

Plan aktif: **[Plan 1 — Foundation](2026-06-11-ruangbabyhappy-plan1-foundation.md)**.
