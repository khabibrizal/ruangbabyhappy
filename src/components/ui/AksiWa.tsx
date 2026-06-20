"use client";
import { useState } from "react";
import { buildWaWebUrl, normalisasiWa } from "@/lib/booking/waLink";

/**
 * Aksi kirim WhatsApp dengan link PDF invoice + opsi platform:
 * - WA Web (desktop): buka chat langsung di WhatsApp Web (wa.me sering error di desktop).
 * - WA HP: skema wa.me (buka aplikasi WhatsApp di HP).
 * - Salin pesan: cadangan (copy lalu paste manual).
 * `invoicePath` (opsional, mis. "/invoice/ABC") digabung dengan origin di client jadi
 * link PDF; bila tak diisi (mis. pesan reminder), link invoice tidak ditambahkan.
 */
export default function AksiWa({
  noWa,
  teks,
  invoicePath,
}: {
  noWa: string;
  teks: string;
  invoicePath?: string;
}) {
  const [tersalin, setTersalin] = useState(false);

  function pesanLengkap() {
    if (!invoicePath) return teks;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${teks}\n📄 Invoice (PDF): ${origin}${invoicePath}`;
  }
  function bukaWeb() {
    window.open(buildWaWebUrl(noWa, pesanLengkap()), "_blank", "noopener,noreferrer");
  }
  function bukaHp() {
    window.open(
      `https://wa.me/${normalisasiWa(noWa)}?text=${encodeURIComponent(pesanLengkap())}`,
      "_blank",
      "noopener,noreferrer",
    );
  }
  async function salin() {
    try {
      await navigator.clipboard.writeText(pesanLengkap());
      setTersalin(true);
      setTimeout(() => setTersalin(false), 2000);
    } catch {
      /* abaikan bila clipboard tak tersedia */
    }
  }

  const btn = "h-10 rounded px-4 text-sm disabled:cursor-not-allowed disabled:opacity-40";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={bukaWeb} disabled={!noWa} className={`${btn} bg-green-600 text-white`}>
        WA Web (desktop)
      </button>
      <button type="button" onClick={bukaHp} disabled={!noWa} className={`${btn} border border-green-600 text-green-700`}>
        WA HP
      </button>
      <button type="button" onClick={salin} className={`${btn} border border-slate-300`}>
        {tersalin ? "Tersalin ✓" : "Salin pesan"}
      </button>
    </div>
  );
}
