const BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

/** "YYYY-MM-DD" -> "DD Namabulan YYYY" (id). Kembalikan apa adanya bila tak cocok. */
export function formatTanggalID(iso: string): string {
  const m = (iso ?? "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso ?? "";
  const [, y, mm, dd] = m;
  return `${Number(dd)} ${BULAN[Number(mm) - 1] ?? mm} ${y}`;
}

/**
 * Bangun pesan WhatsApp REMINDER sesi foto ke customer. Fungsi murni.
 * Body khusus per tipe layanan (mis. Newborn); selain itu pakai reminder umum.
 * Bold WhatsApp pakai *satu* asterisk.
 */
export function buildReminderSesi(p: {
  nama: string;
  layanan: string;
  tanggal: string; // "YYYY-MM-DD"
  jam: string; // "HH:MM"
}): string {
  const nama = p.nama?.trim() || "Kak";
  const tgl = formatTanggalID(p.tanggal);
  const isNewborn = /newborn/i.test(p.layanan ?? "");

  if (isNewborn) {
    return (
      `Hallo Kak ${nama}\n\n` +
      `Mengingatkan kembali untuk jadwal *sesi Newborn Photo* pada:\n\n` +
      `📅 Tanggal: ${tgl}\n` +
      `🕒 Jam: ${p.jam}\n\n` +
      `Agar sesi berjalan lebih nyaman dan si kecil tetap tenang selama pemotretan, mohon dapat disiapkan:\n\n` +
      `🍼 ASIP atau susu dalam botol secukupnya untuk kebutuhan selama sesi.\n` +
      `👶 Popok cadangan.\n` +
      `🧻 Tisu basah dan perlengkapan pribadi si kecil.\n` +
      `👕 Baju ganti bila diperlukan.\n\n` +
      `Tidak perlu khawatir jika si kecil rewel atau membutuhkan waktu untuk menyusu dan beristirahat. ` +
      `Sesi newborn memang mengikuti kenyamanan bayi, sehingga kami akan membantu menciptakan suasana yang tenang dan aman untuk si kecil.\n\n` +
      `Kami tidak sabar untuk mengabadikan momen-momen manis yang hanya terjadi sekali dalam masa pertumbuhan buah hati tercinta ❤️\n\n` +
      `Sampai bertemu Kak. 😊`
    );
  }

  // Reminder umum untuk tipe layanan lain.
  const namaLayanan = p.layanan?.trim() || "foto";
  return (
    `Hallo Kak ${nama}\n\n` +
    `Mengingatkan kembali untuk jadwal *sesi ${namaLayanan}* pada:\n\n` +
    `📅 Tanggal: ${tgl}\n` +
    `🕒 Jam: ${p.jam}\n\n` +
    `Mohon hadir tepat waktu ya Kak. Bila ada kebutuhan atau perlengkapan khusus untuk sesi, boleh kabari kami sebelumnya.\n\n` +
    `Sampai bertemu Kak. 😊`
  );
}
