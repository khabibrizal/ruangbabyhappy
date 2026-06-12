"use client";
import { useState } from "react";
import { buatTransaksiAdmin } from "@/lib/admin/createTransaksiAdmin";
import { cariCustomer, type CustomerHit } from "@/lib/admin/customerSearch";
import { formatRupiah } from "@/lib/format/rupiah";
import { hitungDp } from "@/lib/booking/hitung";

type Paket = { id: string; nama: string; harga: number; dp_persen: number; layanan: string };
type Sesi = { id: string; nama: string; jam_mulai: string };
type Zona = { id: string; nama: string; keterangan: string | null; biaya: number };
type Item = { packageId: string; qty: number };

const inp = "rounded-lg border border-slate-300 p-2 text-sm";

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function FormTransaksiBaru({ paket, sesi, zona }: { paket: Paket[]; sesi: Sesi[]; zona: Zona[] }) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<CustomerHit[] | null>(null);
  const [cust, setCust] = useState<CustomerHit | null>(null);
  const [baru, setBaru] = useState(false);

  const [items, setItems] = useState<Item[]>([{ packageId: paket[0]?.id ?? "", qty: 1 }]);
  const [lokasi, setLokasi] = useState<"studio" | "home">("studio");
  const [zonaId, setZonaId] = useState("");
  const [diskon, setDiskon] = useState(0);

  const hargaOf = (id: string) => paket.find((p) => p.id === id)?.harga ?? 0;
  const total = items.reduce((s, it) => s + hargaOf(it.packageId) * it.qty, 0);
  const ongkos = lokasi === "home" ? (zona.find((z) => z.id === zonaId)?.biaya ?? 0) : 0;
  const tagihan = total + ongkos - diskon;
  const dpPersenPrimary = paket.find((p) => p.id === items[0]?.packageId)?.dp_persen ?? 30;
  const dpAuto = hitungDp(tagihan, dpPersenPrimary);

  async function cari() {
    setHits(await cariCustomer(q));
  }

  return (
    <form action={buatTransaksiAdmin} className="mt-4 flex flex-col gap-5">
      <input type="hidden" name="items" value={JSON.stringify(items)} />
      <input type="hidden" name="customerId" value={cust?.id ?? ""} />

      {/* Customer */}
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="font-semibold text-slate-700">Customer</h2>
        {!baru && (
          <>
            <div className="mt-2 flex gap-2">
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari no WA / nama" className={`flex-1 ${inp}`} />
              <button type="button" onClick={cari} className="rounded-lg bg-slate-800 px-4 text-sm text-white">Cari</button>
            </div>
            {hits && hits.length === 0 && <p className="mt-2 text-sm text-slate-500">Tidak ditemukan. <button type="button" onClick={() => setBaru(true)} className="text-pink-600 underline">Buat customer baru</button></p>}
            {hits && hits.map((h) => (
              <button type="button" key={h.id} onClick={() => { setCust(h); setHits(null); }}
                className={`mt-2 block w-full rounded-lg border p-2 text-left text-sm ${cust?.id === h.id ? "border-pink-400 bg-pink-50" : "border-slate-200"}`}>
                <b>{h.nama ?? "-"}</b> · {h.no_wa ?? "-"} · {h.email ?? "-"}
              </button>
            ))}
            {cust && <p className="mt-2 rounded-lg bg-emerald-50 p-2 text-sm">Dipilih: <b>{cust.nama}</b> · {cust.no_wa} · {cust.email}</p>}
            {!baru && <button type="button" onClick={() => setBaru(true)} className="mt-2 text-xs text-pink-600 underline">+ Customer baru</button>}
          </>
        )}
        {baru && (
          <div className="mt-2 grid grid-cols-2 gap-2">
            <input name="new_nama" placeholder="Nama lengkap" className={`col-span-2 ${inp}`} required />
            <input name="new_wa" placeholder="No WhatsApp" className={inp} />
            <input name="new_email" type="email" placeholder="Email (utk akun)" className={inp} required />
            <input name="new_alamat" placeholder="Alamat" className={`col-span-2 ${inp}`} />
            <button type="button" onClick={() => { setBaru(false); }} className="col-span-2 text-xs text-slate-500 underline">← Pilih customer terdaftar</button>
          </div>
        )}
      </section>

      {/* Anak */}
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="font-semibold text-slate-700">Data Anak</h2>
        <input name="anak_nama" placeholder="Nama anak" className={`mt-2 block w-full ${inp}`} required />
        <div className="mt-2 grid grid-cols-2 gap-2">
          <input name="anak_bb" type="number" step="0.1" min="0" placeholder="BB (kg)" className={inp} required />
          <select name="anak_jk" defaultValue="" className={inp} required>
            <option value="" disabled>Jenis kelamin</option><option value="L">Laki-laki</option><option value="P">Perempuan</option>
          </select>
        </div>
      </section>

      {/* Item produk */}
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="font-semibold text-slate-700">Produk / Paket</h2>
        {items.map((it, idx) => (
          <div key={idx} className="mt-2 flex items-center gap-2">
            <select value={it.packageId} onChange={(e) => setItems(items.map((x, i) => i === idx ? { ...x, packageId: e.target.value } : x))} className={`flex-1 ${inp}`}>
              {paket.map((p) => <option key={p.id} value={p.id}>{p.layanan} · {p.nama} ({formatRupiah(p.harga)})</option>)}
            </select>
            <input type="number" min={1} value={it.qty} onChange={(e) => setItems(items.map((x, i) => i === idx ? { ...x, qty: Math.max(1, Number(e.target.value)) } : x))} className={`w-16 ${inp}`} />
            {items.length > 1 && <button type="button" onClick={() => setItems(items.filter((_, i) => i !== idx))} className="text-red-500">✕</button>}
          </div>
        ))}
        <button type="button" onClick={() => setItems([...items, { packageId: paket[0]?.id ?? "", qty: 1 }])} className="mt-2 text-sm text-pink-600 underline">+ Tambah produk</button>
      </section>

      {/* Jadwal + lokasi */}
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="font-semibold text-slate-700">Jadwal & Lokasi</h2>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <label className="text-sm">Tanggal<input type="date" name="tanggal" defaultValue={todayStr()} className={`mt-1 block w-full ${inp}`} required /></label>
          <label className="text-sm">Sesi<select name="sesiId" className={`mt-1 block w-full ${inp}`} required defaultValue={sesi[0]?.id ?? ""}>
            {sesi.map((s) => <option key={s.id} value={s.id}>{s.nama} ({s.jam_mulai.slice(0, 5)})</option>)}
          </select></label>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <label className={`cursor-pointer rounded-lg border p-2 text-center text-sm font-bold ${lokasi === "studio" ? "border-pink-400 bg-pink-50" : "border-slate-200"}`}>
            <input type="radio" name="lokasi_sesi" value="studio" className="hidden" checked={lokasi === "studio"} onChange={() => setLokasi("studio")} />Di Studio
          </label>
          <label className={`cursor-pointer rounded-lg border p-2 text-center text-sm font-bold ${lokasi === "home" ? "border-pink-400 bg-pink-50" : "border-slate-200"}`}>
            <input type="radio" name="lokasi_sesi" value="home" className="hidden" checked={lokasi === "home"} onChange={() => setLokasi("home")} />Home Service
          </label>
        </div>
        {lokasi === "home" && (
          <div className="mt-2 flex flex-col gap-2">
            <select name="zonaId" value={zonaId} onChange={(e) => setZonaId(e.target.value)} className={inp}>
              <option value="">Pilih zona…</option>
              {zona.map((z) => <option key={z.id} value={z.id}>{z.nama}{z.keterangan ? ` (${z.keterangan})` : ""} — {formatRupiah(z.biaya)}</option>)}
            </select>
            <textarea name="alamat_sesi" rows={2} placeholder="Alamat home service" className={inp} />
          </div>
        )}
      </section>

      {/* Pembayaran */}
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="font-semibold text-slate-700">Pembayaran</h2>
        <div className="mt-2 space-y-1 text-sm">
          <div className="flex justify-between"><span className="text-slate-500">Subtotal produk ({items.reduce((s, it) => s + it.qty, 0)} item)</span><span>{formatRupiah(total)}</span></div>
          {lokasi === "home" && <div className="flex justify-between"><span className="text-slate-500">Ongkos</span><span>{formatRupiah(ongkos)}</span></div>}
          <div className="flex items-center justify-between"><span className="text-slate-500">Diskon (Rp)</span>
            <input type="number" name="diskon" min={0} value={diskon} onChange={(e) => setDiskon(Math.max(0, Number(e.target.value)))} className={`w-32 ${inp}`} /></div>
          <div className="flex justify-between font-bold"><span>Total</span><span>{formatRupiah(tagihan)}</span></div>
        </div>
        <label className="mt-3 block text-sm">Nominal DP (Rp)
          <input type="number" name="dp_amount" min={0} placeholder={`Kosong = auto ${dpPersenPrimary}% (${formatRupiah(dpAuto)})`} className={`mt-1 block w-full ${inp}`} />
        </label>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <label className="text-sm">Status bayar<select name="status" defaultValue="unpaid" className={`mt-1 block w-full ${inp}`}>
            <option value="unpaid">Belum bayar</option><option value="dp_paid">Sudah DP</option><option value="lunas">Lunas</option>
          </select></label>
          <label className="text-sm">Status pengerjaan<select name="status_pengerjaan" defaultValue="" className={`mt-1 block w-full ${inp}`}>
            <option value="">Belum mulai</option><option value="pilih_foto">Pilih Foto</option><option value="edit">Edit</option><option value="cetak">Cetak</option><option value="pengiriman">Pengiriman</option><option value="selesai">Selesai</option>
          </select></label>
        </div>
      </section>

      <button className="h-11 rounded-full bg-grad font-bold text-white">Simpan Transaksi</button>
    </form>
  );
}
