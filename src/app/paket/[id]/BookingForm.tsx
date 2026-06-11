"use client";
import { useState } from "react";
import { buatBooking } from "@/lib/booking/createBooking";
import { btnGrad } from "@/components/ui/buttons";
import SubmitButton from "@/components/ui/SubmitButton";
import { formatRupiah } from "@/lib/format/rupiah";
import { hitungDiskon, hitungTagihan, hitungDp } from "@/lib/booking/hitung";

type SesiOpsi = { id: string; nama: string; jam_mulai: string };
type ZonaOpsi = { id: string; nama: string; keterangan: string | null; biaya: number };

const inp = "rounded-xl bg-white px-3 py-2.5 text-sm ring-1 ring-black/10";

export default function BookingForm({
  packageId,
  harga,
  dpPersen,
  diskonReturning,
  returning,
  zona,
}: {
  packageId: string;
  harga: number;
  dpPersen: number;
  diskonReturning: number;
  returning: boolean;
  zona: ZonaOpsi[];
}) {
  const [tanggal, setTanggal] = useState("");
  const [sesiList, setSesiList] = useState<SesiOpsi[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [sesiId, setSesiId] = useState("");
  const [lokasi, setLokasi] = useState<"studio" | "home">("home");
  const [zonaId, setZonaId] = useState("");

  async function cekSesi(tgl: string) {
    setTanggal(tgl);
    setSesiId("");
    if (!tgl) return setSesiList(null);
    setLoading(true);
    const res = await fetch(`/api/sesi?paket=${packageId}&tanggal=${tgl}`);
    const json = await res.json();
    setSesiList(json.sesi ?? []);
    setLoading(false);
  }

  const ongkos = lokasi === "home" ? (zona.find((z) => z.id === zonaId)?.biaya ?? 0) : 0;
  const diskon = hitungDiskon({ returning, diskonReturning });
  const total = hitungTagihan({ harga, ongkos, diskon });
  const dp = hitungDp(total, dpPersen);
  const bisaSubmit = !!sesiId && (lokasi === "studio" || (!!zonaId));

  return (
    <form action={buatBooking} className="mt-6 flex flex-col gap-4">
      <input type="hidden" name="packageId" value={packageId} />
      <input type="hidden" name="sesiId" value={sesiId} />

      {/* Tanggal */}
      <div>
        <label className="text-sm font-bold">📅 Tanggal</label>
        <input type="date" name="tanggal" value={tanggal} required
          onChange={(e) => cekSesi(e.target.value)} className={`mt-1 block w-full ${inp}`} />
      </div>

      {/* Sesi */}
      {loading && <p className="text-sm text-foreground/50">Memuat sesi…</p>}
      {!loading && sesiList && sesiList.length === 0 && (
        <p className="text-sm text-foreground/50">Tidak ada sesi tersedia pada tanggal ini.</p>
      )}
      {!loading && sesiList && sesiList.length > 0 && (
        <div>
          <label className="text-sm font-bold">⏰ Pilih Sesi</label>
          <div className="mt-1 grid grid-cols-2 gap-2">
            {sesiList.map((s) => (
              <button key={s.id} type="button" onClick={() => setSesiId(s.id)}
                className={`rounded-2xl p-3 text-center text-sm font-bold ring-1 transition ${
                  sesiId === s.id ? "bg-grad text-white ring-transparent" : "bg-white ring-black/10"
                }`}>
                {s.nama} · {s.jam_mulai.slice(0, 5)}
              </button>
            ))}
          </div>
        </div>
      )}

      {sesiId && (
        <>
          {/* Data anak */}
          <div className="rounded-2xl bg-white/60 p-3">
            <div className="text-sm font-bold">🍼 Data Anak</div>
            <input name="anak_nama" placeholder="Nama anak" className={`mt-2 block w-full ${inp}`} required />
            <div className="mt-2 grid grid-cols-2 gap-2">
              <input name="anak_bb" type="number" step="0.1" min="0" placeholder="Berat badan (kg)" className={inp} required />
              <select name="anak_jk" className={inp} required defaultValue="">
                <option value="" disabled>Jenis kelamin</option>
                <option value="L">Laki-laki</option>
                <option value="P">Perempuan</option>
              </select>
            </div>
          </div>

          {/* Lokasi */}
          <div>
            <label className="text-sm font-bold">📍 Lokasi Sesi</label>
            <div className="mt-1 grid grid-cols-2 gap-2">
              <label className={`cursor-pointer rounded-2xl p-3 text-center text-sm font-bold ring-1 ${lokasi === "studio" ? "bg-grad text-white ring-transparent" : "bg-white ring-black/10"}`}>
                <input type="radio" name="lokasi_sesi" value="studio" className="hidden"
                  checked={lokasi === "studio"} onChange={() => setLokasi("studio")} />
                Di Studio
              </label>
              <label className={`cursor-pointer rounded-2xl p-3 text-center text-sm font-bold ring-1 ${lokasi === "home" ? "bg-grad text-white ring-transparent" : "bg-white ring-black/10"}`}>
                <input type="radio" name="lokasi_sesi" value="home" className="hidden"
                  checked={lokasi === "home"} onChange={() => setLokasi("home")} />
                Home Service
              </label>
            </div>
            {lokasi === "home" && (
              <div className="mt-2 flex flex-col gap-2">
                <select name="zonaId" value={zonaId} onChange={(e) => setZonaId(e.target.value)} className={inp} required>
                  <option value="" disabled>Pilih zona…</option>
                  {zona.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.nama}{z.keterangan ? ` (${z.keterangan})` : ""} — {formatRupiah(z.biaya)}
                    </option>
                  ))}
                </select>
                <textarea name="alamat_sesi" rows={2} placeholder="Alamat lengkap home service" className={inp} required />
              </div>
            )}
          </div>

          {/* Rincian total */}
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-pink-100">
            <div className="text-sm font-bold">💰 Rincian Pembayaran</div>
            <div className="mt-2 space-y-1.5 text-sm font-semibold">
              <div className="flex justify-between"><span className="text-foreground/60">Paket</span><span>{formatRupiah(harga)}</span></div>
              {lokasi === "home" && (
                <div className="flex justify-between"><span className="text-foreground/60">Home Service</span><span>{formatRupiah(ongkos)}</span></div>
              )}
              {diskon > 0 && (
                <div className="flex justify-between text-emerald-600"><span>Diskon pelanggan lama</span><span>−{formatRupiah(diskon)}</span></div>
              )}
              <div className="border-t border-dashed border-black/10 my-1.5" />
              <div className="flex justify-between text-base font-extrabold"><span>Total</span><span className="text-grad">{formatRupiah(total)}</span></div>
              <div className="flex justify-between text-pink-500 font-bold"><span>DP ({dpPersen}%)</span><span>{formatRupiah(dp)}</span></div>
              <div className="flex justify-between text-xs text-foreground/50"><span>Sisa saat hari-H</span><span>{formatRupiah(total - dp)}</span></div>
            </div>
          </div>

          {/* Bukti */}
          <label className="text-sm font-bold">🧾 Bukti Transfer (wajib)
            <input name="bukti" type="file" accept="image/*" required
              className="mt-1 block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-pink-100 file:px-4 file:py-2 file:font-bold file:text-pink-600" />
          </label>

          <SubmitButton className={`${btnGrad} w-full`} pendingText="Mengirim booking…">Buat Booking 🎀</SubmitButton>
        </>
      )}
    </form>
  );
}
