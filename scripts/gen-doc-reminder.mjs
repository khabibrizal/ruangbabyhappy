/**
 * Generate PDF dokumentasi fitur "Reminder Sesi (WA)".
 * Jalankan: node scripts/gen-doc-reminder.mjs
 * Output: docs/Fitur-Reminder-Sesi.pdf
 *
 * Pakai @react-pdf/renderer (sudah dependency project). Tanpa JSX (React.createElement).
 * Catatan: font default @react-pdf tak punya emoji -> teks dibuat tanpa emoji agar rapi.
 */
import { createElement as h } from "react";
import { Document, Page, Text, View, StyleSheet, renderToFile } from "@react-pdf/renderer";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "docs", "Fitur-Reminder-Sesi.pdf");

const PINK = "#ec4899";
const INK = "#1f2937";
const MUTE = "#6b7280";

const s = StyleSheet.create({
  page: { paddingVertical: 48, paddingHorizontal: 54, fontSize: 11, color: INK, lineHeight: 1.5 },
  brand: { fontSize: 10, color: PINK, fontWeight: 700, letterSpacing: 1 },
  h1: { fontSize: 22, fontWeight: 700, marginTop: 6, marginBottom: 2 },
  meta: { fontSize: 9, color: MUTE, marginBottom: 16 },
  h2: { fontSize: 14, fontWeight: 700, marginTop: 18, marginBottom: 6, color: PINK },
  p: { marginBottom: 6 },
  li: { marginBottom: 3, paddingLeft: 12 },
  b: { fontWeight: 700 },
  code: {
    fontFamily: "Courier", fontSize: 9.5, backgroundColor: "#f3f4f6", color: "#111827",
    padding: 10, borderRadius: 4, marginTop: 4, marginBottom: 8, lineHeight: 1.45,
  },
  foot: { position: "absolute", bottom: 24, left: 54, right: 54, fontSize: 8, color: MUTE, textAlign: "center" },
});

const P = (...kids) => h(Text, { style: s.p }, ...kids);
const H2 = (t) => h(Text, { style: s.h2 }, t);
const LI = (t) => h(Text, { style: s.li }, `•  ${t}`);
const B = (t) => h(Text, { style: s.b }, t);
const CODE = (t) => h(Text, { style: s.code }, t);

const templateNewborn =
`Hallo Kak {nama}

Mengingatkan kembali untuk jadwal *sesi Newborn Photo* pada:

Tanggal: {tanggal}     Jam: {jam}

Agar sesi berjalan lebih nyaman dan si kecil tetap tenang selama
pemotretan, mohon dapat disiapkan:
- ASIP atau susu dalam botol secukupnya untuk kebutuhan selama sesi.
- Popok cadangan.
- Tisu basah dan perlengkapan pribadi si kecil.
- Baju ganti bila diperlukan.

Tidak perlu khawatir jika si kecil rewel atau membutuhkan waktu untuk
menyusu dan beristirahat. Sesi newborn memang mengikuti kenyamanan
bayi, sehingga kami akan membantu menciptakan suasana yang tenang dan
aman untuk si kecil.

Kami tidak sabar untuk mengabadikan momen-momen manis yang hanya
terjadi sekali dalam masa pertumbuhan buah hati tercinta.

Sampai bertemu Kak.`;

const doc = h(
  Document,
  { title: "Dokumentasi Fitur Reminder Sesi (WA) - Ruang Baby Happy" },
  h(
    Page,
    { size: "A4", style: s.page },
    h(Text, { style: s.brand }, "RUANG BABY HAPPY"),
    h(Text, { style: s.h1 }, "Fitur Reminder Sesi (WhatsApp)"),
    h(Text, { style: s.meta }, "Dokumentasi internal - dibuat 2026-06-18"),

    H2("1. Apa itu?"),
    P("Tombol untuk mengirim ", B("pesan pengingat (reminder) jadwal sesi foto"),
      " ke customer lewat WhatsApp, langsung dari halaman detail transaksi. Isi pesan otomatis menyesuaikan nama customer, tanggal & jam sesi, serta tipe layanan."),

    H2("2. Lokasi"),
    P("Admin -> Transaksi -> klik salah satu transaksi -> kartu ", B("\"Reminder Sesi (WA)\""),
      " (di atas bagian Invoice)."),

    H2("3. Cara pakai"),
    LI("Buka detail transaksi customer yang akan melakukan sesi."),
    LI("Pada kartu \"Reminder Sesi (WA)\", pilih: WA Web (desktop), WA HP, atau Salin pesan."),
    LI("Aplikasi/WhatsApp Web terbuka dengan pesan reminder yang sudah terisi otomatis."),
    LI("Periksa sekilas, lalu kirim ke customer."),

    H2("4. Isi pesan otomatis"),
    P("Pesan dibuat berdasarkan tipe layanan transaksi:"),
    P(B("a) Layanan Newborn"), " -> template lengkap berisi sapaan, jadwal, dan checklist persiapan (ASIP/susu, popok, tisu basah, baju ganti) plus paragraf menenangkan. Contoh (placeholder {nama}/{tanggal}/{jam} terisi otomatis):"),
    CODE(templateNewborn),
    P(B("b) Layanan lain"), " (Cakesmash, Maternity, dll) -> reminder umum: sapaan + jadwal + ajakan hadir tepat waktu."),

    h(Text, { style: s.foot, fixed: true, render: ({ pageNumber, totalPages }) =>
      `Ruang Baby Happy - Fitur Reminder Sesi - Halaman ${pageNumber}/${totalPages}` }),
  ),
  h(
    Page,
    { size: "A4", style: s.page },
    H2("5. Catatan teknis (untuk developer)"),
    LI("Builder pesan (fungsi murni): src/lib/booking/waReminder.ts -> buildReminderSesi({ nama, layanan, tanggal, jam })."),
    LI("Tanggal diformat ke Indonesia oleh formatTanggalID (mis. 2026-06-12 -> 12 Juni 2026)."),
    LI("Deteksi Newborn case-insensitive (regex /newborn/i) sehingga \"Newborn 2025\" tetap memakai template Newborn."),
    LI("UI memakai komponen src/components/ui/AksiWa.tsx (WA Web / WA HP / Salin). Prop invoicePath dibuat opsional; reminder tidak melampirkan link invoice."),
    LI("Dipasang di src/app/admin/transaksi/[kode]/page.tsx (kartu Reminder Sesi)."),
    LI("Bold WhatsApp memakai satu tanda bintang: *sesi Newborn Photo*."),
    LI("Unit test: tests/unit/waReminder.test.ts (6 kasus)."),

    H2("6. Menambah template untuk layanan lain"),
    P("Edit ", B("src/lib/booking/waReminder.ts"), ". Pada fungsi buildReminderSesi, tambahkan cabang baru sebelum bagian reminder umum, mirip blok Newborn. Contoh pola:"),
    CODE(
`const isCakesmash = /cakesmash/i.test(p.layanan ?? "");
if (isCakesmash) {
  return (
    \`Hallo Kak \${nama}\\n\\n\` +
    \`Mengingatkan jadwal *sesi Cakesmash* pada:\\n\\n\` +
    \`Tanggal: \${tgl}   Jam: \${p.jam}\\n\\n\` +
    \`Persiapan: ... (sesuaikan)\\n\\n\` +
    \`Sampai bertemu Kak.\`
  );
}`),
    P("Setelah mengubah template, jalankan ", B("npx vitest run"), " dan ", B("npm run build"),
      ", lalu deploy (vercel --prod). Tidak perlu migrasi database."),

    H2("7. Catatan"),
    LI("Emoji pada PDF ini sengaja dihilangkan agar tampil rapi; pesan WhatsApp yang dikirim TETAP memuat emoji (kalender, jam, botol, dll)."),
    LI("Reminder tidak menulis ke database - hanya membuka WhatsApp dengan teks siap kirim, jadi aman diklik berkali-kali."),

    h(Text, { style: s.foot, fixed: true, render: ({ pageNumber, totalPages }) =>
      `Ruang Baby Happy - Fitur Reminder Sesi - Halaman ${pageNumber}/${totalPages}` }),
  ),
);

await renderToFile(doc, OUT);
console.log("PDF dibuat:", OUT);
