"use client";
import { normalisasiWa } from "@/lib/booking/waLink";

export default function KirimInvoiceWA({
  noWa, kode, layanan, paket, tanggal, sesi, total, status,
}: {
  noWa: string; kode: string; layanan: string; paket: string; tanggal: string; sesi: string; total: number; status: string;
}) {
  function kirim() {
    const origin = window.location.origin;
    const teks =
      `Halo, berikut detail transaksi Anda di Ruang Baby Happy:\n` +
      `Kode: ${kode}\nLayanan: ${layanan}\nPaket: ${paket}\nJadwal: ${tanggal} (${sesi})\n` +
      `Total: Rp${total.toLocaleString("id-ID")}\nStatus: ${status}\n` +
      `Invoice: ${origin}/invoice/${kode}\nTerima kasih! 🎀`;
    window.open(`https://wa.me/${normalisasiWa(noWa)}?text=${encodeURIComponent(teks)}`, "_blank", "noopener,noreferrer");
  }
  return (
    <button type="button" onClick={kirim} disabled={!noWa}
      className="h-10 rounded bg-green-500 px-4 text-sm font-bold text-white disabled:opacity-40">
      Kirim Invoice WA
    </button>
  );
}
