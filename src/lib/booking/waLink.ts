type WaInfo = { kode: string; layanan: string; paket: string; tanggal: string; sesi: string };

/** Normalisasi nomor WA Indonesia ke format internasional tanpa '+': 0xxx -> 62xxx. */
export function normalisasiWa(no: string): string {
  const digits = (no ?? "").replace(/\D/g, "");
  if (digits.startsWith("0")) return "62" + digits.slice(1);
  return digits;
}

/**
 * URL WhatsApp Web — membuka chat LANGSUNG (bukan pencarian kontak).
 * Dipakai untuk desktop: `wa.me` di desktop sering dilempar ke api.whatsapp.com yang error.
 * `type=phone_number&app_absent=0` wajib agar WA Web me-resolve nomor & buka chat.
 */
export function buildWaWebUrl(noWa: string, teks: string): string {
  return `https://web.whatsapp.com/send?phone=${normalisasiWa(noWa)}&text=${encodeURIComponent(teks)}&type=phone_number&app_absent=0`;
}

/** Bangun tautan wa.me berisi template konfirmasi booking ke nomor admin layanan. */
export function buildWaLink(adminPhone: string, info: WaInfo): string {
  const teks =
    `Halo Admin Ruang Baby Happy, saya mau konfirmasi booking:\n` +
    `Kode: ${info.kode}\n` +
    `Layanan: ${info.layanan}\n` +
    `Paket: ${info.paket}\n` +
    `Tanggal: ${info.tanggal} (${info.sesi})\n` +
    `Bukti transfer sudah saya upload. Mohon diverifikasi, terima kasih.`;
  return `https://wa.me/${normalisasiWa(adminPhone)}?text=${encodeURIComponent(teks)}`;
}
