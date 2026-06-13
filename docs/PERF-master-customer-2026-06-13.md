# Perbaikan Performa — Master Customer

**Tanggal:** 2026-06-13
**Area:** `/admin/master/customer` & `/admin/master/customer/[id]`
**Commit:** `ccae3cd` (+ `992705f`/`9d20118` untuk pemisahan halaman detail)

## Masalah

Saat admin mengklik customer di daftar, perpindahan ke halaman detail **tidak terasa langsung** — ada jeda tanpa feedback apa pun sebelum halaman detail muncul.

## Akar masalah

1. **Tidak ada loading boundary di level yang tepat.**
   Halaman detail `/admin/master/customer/[id]` bersifat `force-dynamic` (render di server tiap request: auth + query DB). Satu-satunya `loading.tsx` ada di `src/app/admin/loading.tsx`, dan boundary itu **sudah resolve** sejak admin pertama kali masuk `/admin`. Akibatnya, sub-navigasi dari daftar ke detail **tidak punya Suspense fallback aktif**, sehingga Next.js App Router menunggu render server selesai sepenuhnya sebelum berpindah halaman — terlihat seperti "klik tidak bereaksi".

2. **Kolom filter tanpa indeks.**
   Query riwayat transaksi (`listTransaksiByCustomer`) memfilter `booking.customer_profile_id`, tetapi tabel `booking` hanya punya indeks pada `tanggal` dan `sesi_id` — **bukan** `customer_profile_id`. Jadi query melakukan *sequential scan*. Masih cepat (~0.16–0.20 s) selagi data sedikit, tetapi akan memburuk seiring jumlah booking bertambah.

## Perbaikan

### 1. `loading.tsx` di level halaman detail (fix utama — sudah live)

`src/app/admin/master/customer/[id]/loading.tsx`

```tsx
import Spinner from "@/components/ui/Spinner";

// Boundary loading utk transisi ke halaman detail customer (force-dynamic) ->
// klik langsung menampilkan spinner & mengaktifkan prefetch shell oleh <Link>.
export default function Loading() {
  return <Spinner />;
}
```

Efek:
- Klik customer **langsung** menampilkan spinner (transisi terasa instan), lalu konten detail di-*stream* setelah server siap.
- `<Link>` bisa **prefetch shell** halaman detail, mempercepat transisi.
- **Tidak butuh migration** — langsung berlaku setelah deploy.

### 2. Indeks DB (opsional, non-blocking)

`supabase/migrations/0012_booking_customer_idx.sql`

```sql
create index if not exists booking_customer_profile_id_idx
  on public.booking (customer_profile_id);
```

- Menghilangkan *sequential scan* pada query riwayat transaksi per customer.
- `if not exists` → aman dijalankan ulang.
- Bukan syarat untuk fix klik di atas; murni *future-proofing* saat data tumbuh.

## Konteks terkait

Sebelum perbaikan ini, detail customer ditampilkan **inline** di halaman daftar via `?profileId`. Itu diubah menjadi **halaman terpisah** `/admin/master/customer/[id]` (commit `992705f`), yang kemudian memunculkan kebutuhan loading boundary di atas. Tombol "← Daftar Customer" dan redirect setelah simpan mempertahankan konteks pencarian/halaman (`q`, `page`).

## Verifikasi

- Build bersih, unit test hijau (42/42).
- Waktu query riwayat transaksi (via REST): ~0.18 s (didominasi latensi jaringan; manfaat indeks meningkat seiring volume data).
- Manual: klik customer → spinner muncul seketika, lalu detail.

## Kemungkinan optimasi lanjutan (belum dikerjakan)

- **Overhead auth di layout admin.** `getCurrentProfile()` dipanggil tiap navigasi admin (cek sesi ke Supabase). Bila masih terasa ada jeda kecil sebelum spinner, ini kandidat berikutnya (mis. caching sesi per request).
