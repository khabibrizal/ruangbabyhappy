"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { formatRupiah } from "@/lib/format/rupiah";

export type ResiListRow = {
  id: string;
  kode: string;
  statusBayarLabel: string;
  tahapLabel: string;
  layanan: string;
  paket: string;
  tanggal: string;
  sesi: string;
  nama: string;
  tagihan: number;
  eligible: boolean; // status pengerjaan Pengiriman/Selesai -> boleh cetak resi
};

export default function TransaksiList({ rows }: { rows: ResiListRow[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const eligibleKodes = useMemo(() => rows.filter((r) => r.eligible).map((r) => r.kode), [rows]);
  const semuaTerpilih = eligibleKodes.length > 0 && eligibleKodes.every((k) => selected.has(k));

  function toggle(kode: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(kode)) next.delete(kode); else next.add(kode);
      return next;
    });
  }
  function toggleSemua() {
    setSelected(semuaTerpilih ? new Set() : new Set(eligibleKodes));
  }
  function cetakResi() {
    const kode = [...selected];
    if (kode.length === 0) return;
    window.open(`/admin/resi?kode=${encodeURIComponent(kode.join(","))}`, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="mt-2">
      {/* Toolbar resi */}
      <div className="mb-3 flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-3">
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={semuaTerpilih} onChange={toggleSemua} disabled={eligibleKodes.length === 0} />
          Pilih semua siap-kirim ({eligibleKodes.length})
        </label>
        <button
          type="button"
          onClick={cetakResi}
          disabled={selected.size === 0}
          className="ml-auto h-9 rounded bg-slate-800 px-4 text-sm text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          Cetak Resi ({selected.size})
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {rows.map((r) => (
          <div key={r.id} className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4">
            {r.eligible ? (
              <input
                type="checkbox"
                className="mt-1"
                checked={selected.has(r.kode)}
                onChange={() => toggle(r.kode)}
                aria-label={`Pilih resi ${r.kode}`}
              />
            ) : (
              <span className="mt-1 inline-block w-[13px]" aria-hidden />
            )}
            <Link href={`/admin/transaksi/${r.kode}`} className="block flex-1 hover:opacity-80">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-mono font-semibold">{r.kode}</span>
                <span className="flex gap-1">
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-xs">{r.statusBayarLabel}</span>
                  <span className="rounded bg-pink-100 px-2 py-0.5 text-xs text-pink-600">{r.tahapLabel}</span>
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-600">
                {r.layanan} · {r.paket} · {r.tanggal} {r.sesi} · {r.nama}
              </p>
              <p className="mt-1 text-sm">Total: {formatRupiah(r.tagihan)}</p>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
