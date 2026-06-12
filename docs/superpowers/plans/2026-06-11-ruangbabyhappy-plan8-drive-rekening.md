# Ruang Baby Happy — Plan 8: Link Drive Hasil Foto + Rekening/WA per Layanan

> Presentasi+logika ringan. 2 kolom baru via migration 0006 (manual SQL).

## Tujuan
- **A.** Admin input **link Google Drive** hasil foto di detail transaksi (kolom `booking.drive_url`). Member melihat tombol **Download Foto** (buka link) ketika `status_pengerjaan` sudah **≥ pilih_foto** dan `drive_url` terisi — di dashboard `/member` & detail `/member/[kode]`.
- **B.** Rekening transfer **per layanan**: tambah `layanan.bank/no_rek/atas_nama` (WA sudah ada = `admin_wa`). Tampilkan rekening+WA layanan terkait di: halaman paket (`/paket/[id]`), konfirmasi (`/booking/[kode]`), detail member, dan invoice (ganti rekening global brand → per layanan).

## Migration 0006 (manual SQL)
```sql
alter table public.booking add column if not exists drive_url text;
alter table public.layanan add column if not exists bank text;
alter table public.layanan add column if not exists no_rek text;
alter table public.layanan add column if not exists atas_nama text;
```

## Task 1 — Master Layanan: kolom rekening
- `src/lib/admin/masterQueries.ts`: `LayananRow` + `listLayanan` select tambah `bank, no_rek, atas_nama`.
- `src/lib/admin/masterActions.ts`: `buatLayanan`+`updateLayanan` tambah `bank/no_rek/atas_nama` dari formData.
- `src/app/admin/master/layanan/page.tsx`: tambah input Bank, No Rek, Atas Nama di form buat & edit.
Commit.

## Task 2 — Query: drive_url + rekening layanan
- `src/lib/booking/queries.ts`:
  - `getDetailTransaksi`: select tambah `drive_url`, dan pada `package.layanan(... )` tambah `bank, no_rek, atas_nama`; tambah field tipe `drive_url: string | null` + `layanan.bank/no_rek/atas_nama`.
  - `getBookingByKode`: select tambah `drive_url` + layanan `bank,no_rek,atas_nama`; return `drive_url`, `layanan_bank`, `layanan_no_rek`, `layanan_atas_nama`.
- `src/lib/member/queries.ts`:
  - `getMyBookings`: select tambah `drive_url` (sudah ada status_pengerjaan) + return.
  - `getMyBookingDetail`: select tambah `drive_url` + layanan `bank,no_rek,atas_nama`; return.
- `src/lib/catalog/queries.ts` `getPackageById`: select layanan tambah `bank,no_rek,atas_nama`; return `layanan_bank/no_rek/atas_nama` (admin_wa sudah ada).
Commit.

## Task 3 — Admin detail: input link Drive
- `src/lib/booking/adminPayment.ts` `updateStatusPengerjaan`: baca `drive_url` dari formData; update `booking { status_pengerjaan, drive_url }`.
- `src/app/admin/transaksi/[kode]/page.tsx`: di form "Status Pengerjaan" tambah input `name="drive_url"` defaultValue `d.drive_url ?? ""` (placeholder "Link Google Drive hasil foto"). (getDetailTransaksi sudah balikkan drive_url dari Task 2.)
Commit.

## Task 4 — Member: tombol Download Foto + rekening/WA
- `src/lib/booking/statusPengerjaan.ts` sudah punya `indexTahap`. Tombol muncul bila `indexTahap(status) >= 0 && drive_url`.
- `src/app/member/page.tsx`: pada kartu, bila syarat → tombol **Download Foto** (`<a href={b.drive_url} target=_blank>`). (getMyBookings balikkan drive_url.)
- `src/app/member/[kode]/page.tsx`: tombol Download Foto (syarat sama) + blok **Transfer ke**: bank/no_rek/atas_nama layanan (bila ada) + WA (sudah ada).
Commit.

## Task 5 — Paket detail + Konfirmasi: rekening+WA layanan
- `src/app/paket/[id]/page.tsx`: tampilkan blok "Transfer DP ke" (bank/no_rek/atas_nama layanan) + WA admin layanan, agar member tahu ke mana transfer sebelum upload bukti. (getPackageById balikkan rekening.)
- `src/app/booking/[kode]/page.tsx`: tambah blok rekening layanan di atas/dekat tombol Chat WA. (getBookingByKode balikkan rekening.)
Commit.

## Task 6 — Invoice: rekening per layanan
- `src/app/invoice/[kode]/route.ts`: kirim `bank/noRek/atasNama` dari `d.layanan` (fallback brand bila kosong) ke InvoiceData.
- `src/lib/invoice/InvoiceDocument.tsx`: `InvoiceData` tambah `bank/noRek/atasNama`; blok "PEMBAYARAN KE" pakai props itu (bukan `brand`).
Commit.

## Task 7 — Verifikasi
Build hijau; E2E `npm run test:e2e -- smoke plan6 transaksi-admin` hijau (kill zombie port dulu). Tambah/maintain E2E ringan opsional.

## Self-Review (vs permintaan)
- Admin input link Drive di transaksi ✓; member tombol Download Foto saat status ≥ pilih_foto + link ada ✓.
- Rekening+WA per layanan (newborn beda) tampil di paket/konfirmasi/detail member/invoice ✓.
- Kolom baru `booking.drive_url`, `layanan.bank/no_rek/atas_nama` (migration 0006). Tidak ubah kapasitas/diskon/DP.
