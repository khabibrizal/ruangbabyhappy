# Desain: Cetak Resi Pengiriman (PDF)

**Tanggal:** 2026-06-13
**App:** Ruang Baby Happy (Next.js 16 + Supabase)

## Tujuan

Admin bisa mencetak **resi pengiriman** (label kirim) untuk transaksi yang
hasil fotonya sedang/akan dikirim. Dari menu `/admin/transaksi`, admin
mencentang beberapa transaksi lalu klik **"Cetak Resi"**; output PDF berisi
blok Pengirim/Penerima, maksimal **5 client per lembar A4**.

## Keputusan (hasil brainstorming)

- **Alamat penerima:** dari **profil customer** (`profiles.alamat`).
- **Status eligible:** `status_pengerjaan ∈ {pengiriman, selesai}`. Hanya baris
  ini yang punya checkbox & bisa dicetak.
- **Pengirim per layanan:** nama = brand "Ruang Baby Happy"; nomor =
  `layanan.admin_wa` dari transaksi tsb (cakesmash → no cakesmash, dst). Tiap
  blok penerima punya baris Pengirim sendiri.
- **Seleksi:** dalam halaman aktif (list ber-paginasi 10/halaman) + tombol
  "pilih semua eligible di halaman ini". Tanpa migration.

## Format PDF (sesuai contoh)

Per blok client (5 blok/halaman A4, sisanya ke halaman berikutnya):

```
Pengirim   : Ruang Baby Happy (082233684933)
Penerima   : {nama} ({no_wa})
             {alamat profil}
```

## Komponen & file

1. **`src/lib/resi/ResiDocument.tsx`** — dokumen PDF `@react-pdf/renderer`
   (mirror `InvoiceDocument`). Memecah daftar penerima per 5 → multi-page.
   Fungsi murni `chunk5(items)` dipisah agar bisa di-unit-test.
2. **`src/lib/booking/queries.ts` → `listResiByKodes(kodes: string[])`** —
   ambil booking by `kode_booking`, **filter server-side** `status_pengerjaan
   in (pengiriman, selesai)`, kembalikan:
   `{ kode, penerimaNama, penerimaWa, penerimaAlamat, pengirimNama, pengirimWa }`.
   pengirimNama = `brand.nama`; pengirimWa = `layanan.admin_wa`.
   Batasi jumlah kode (mis. ≤ 200).
3. **`src/app/admin/resi/route.ts`** — `GET ?kode=A,B,C`. **Guard admin**
   (getCurrentProfile role admin → else 403). Render PDF, `Content-Type:
   application/pdf`, `Content-Disposition: inline`. Eligibility difilter di sini
   juga (anti-tamper URL).
4. **`src/app/admin/transaksi/TransaksiList.tsx`** (client) — render baris
   transaksi + checkbox (hanya baris eligible) + toolbar tombol "Cetak Resi
   (N)" yang membuka `/admin/resi?kode=…` di tab baru. Filter & paginasi tetap
   di `page.tsx` (server); page meneruskan rows (serializable) ke komponen ini.

## Data flow

`page.tsx` (server: filter+paginasi+listTransaksiAdmin)
→ `TransaksiList` (client: state seleksi kode eligible)
→ buka `/admin/resi?kode=…`
→ route: guard admin → `listResiByKodes` (filter eligible) → `ResiDocument` → PDF.

## Error & edge

- Kode non-eligible / tak ditemukan → dibuang diam-diam (tidak masuk PDF).
- Tak ada kode valid → PDF kosong dgn pesan "Tidak ada data resi" (atau 400).
- Alamat/no_wa kosong → tampilkan "-".
- Non-admin akses route → 403.

## Testing

- Unit (vitest): `chunk5([...])` — pemecahan 5/halaman (0, 5, 6, 12 item).
- Build hijau; manual: centang 6 transaksi eligible → PDF 2 halaman (5+1).

## Di luar cakupan (YAGNI)

- Integrasi kurir/JNE/marketplace, generate barcode/QR, tracking number.
- Seleksi lintas halaman (cukup per halaman).
- Kustomisasi template/logo resi.
