import { formatRupiah } from "@/lib/format/rupiah";
import { brand } from "@/lib/brand";
import { SITE_URL } from "@/lib/seo/config";

export type StatusBayar = "unpaid" | "dp_paid" | "lunas";

const NAMA = brand.nama;
const TAGLINE = brand.tagline;
const IG = `@${brand.ig}`;
const WEB = SITE_URL;
/** Rekening default (fallback) bila layanan belum mengisi rekening sendiri. */
const REKENING_DEFAULT = `${brand.bank} ${brand.noRek} a.n ${brand.atasNama}`;
/** Promo silang ke usaha satu grup (studio foto & photobooth event). */
const PROMO_STUDIO =
  `\n\nOh ya, butuh booking studio foto atau photobooth event? 📸\n` +
  `Cek juga Ruang Happy Studio di www.ruanghappystudio.web.id`;

const LABEL: Record<StatusBayar, string> = {
  unpaid: "Belum bayar",
  dp_paid: "Sudah DP",
  lunas: "Lunas",
};

/**
 * Susun string rekening dari data layanan (per-layanan), fallback ke brand.
 * Ruang Baby Happy menyimpan rekening di tabel layanan (bukan global).
 */
export function buildRekening(l: {
  bank?: string | null;
  no_rek?: string | null;
  atas_nama?: string | null;
} | null | undefined): string {
  const bank = l?.bank?.trim();
  const noRek = l?.no_rek?.trim();
  const atasNama = l?.atas_nama?.trim();
  if (bank && noRek) return `${bank} ${noRek}${atasNama ? ` a.n ${atasNama}` : ""}`;
  return REKENING_DEFAULT;
}

/**
 * Bangun teks pesan WhatsApp ke customer.
 * Nada hangat-akrab, sapaan "Kak {nama}", beda per status bayar,
 * dengan ajakan kembali (web + IG + rekomendasi). Fungsi murni.
 * `rekening` di-inject caller (per-layanan) agar builder tetap murni.
 */
export function buildPesanWa(p: {
  nama: string;
  kode: string;
  rincian: string;
  total: number;
  sisa: number;
  statusKey: StatusBayar;
  rekening: string;
}): string {
  const pembuka =
    `Halo Kak ${p.nama} 🤍\n` +
    `Terima kasih sudah memesan di ${NAMA} — ${TAGLINE} ✨\n\n` +
    `Detail pesanan Kakak:\n` +
    `Kode: ${p.kode}\n` +
    `${p.rincian}\n` +
    `Total: ${formatRupiah(p.total)}\n`;

  if (p.statusKey === "lunas") {
    return (
      pembuka +
      `Status: Lunas ✅\n\n` +
      `Senang banget bisa jadi bagian dari momen si kecil! Sampai jumpa di sesi berikutnya ya 💜\n` +
      `📸 Booking lagi: ${WEB}\n` +
      `📷 Follow IG ${IG} (update & promo)\n` +
      `Simpan nomor ini ya Kak, & boleh banget rekomendasikan ${NAMA} ke teman & keluarga 🤗` +
      PROMO_STUDIO
    );
  }

  return (
    pembuka +
    `Sisa yang perlu dilunasi: ${formatRupiah(p.sisa)}\n` +
    `Status: ${LABEL[p.statusKey]}\n\n` +
    `💳 Pembayaran transfer ke:\n` +
    `${p.rekening}\n` +
    `Mohon konfirmasi dengan kirim bukti transfer ke chat ini ya Kak 🙏\n\n` +
    `Ditunggu kedatangannya! Biar nggak ketinggalan update & promo:\n` +
    `📷 Follow IG ${IG}\n` +
    `📸 Booking berikutnya: ${WEB}\n` +
    `Simpan nomor ini ya Kak, boleh juga direkomendasikan ke teman & keluarga 🤗` +
    PROMO_STUDIO
  );
}
