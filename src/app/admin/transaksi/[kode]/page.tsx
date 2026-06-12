import Link from "next/link";
import { notFound } from "next/navigation";
import { getDetailTransaksi } from "@/lib/booking/queries";
import { getBookingItems } from "@/lib/booking/queries";
import { simpanDetailTransaksi, updateStatusPengerjaan, rescheduleBooking } from "@/lib/booking/adminPayment";
import { listPaket, listSesi } from "@/lib/admin/masterQueries";
import { formatRupiah } from "@/lib/format/rupiah";
import { TAHAP_PENGERJAAN, LABEL_PENGERJAAN } from "@/lib/booking/statusPengerjaan";
import KirimInvoiceWA from "./KirimInvoiceWA";

export const dynamic = "force-dynamic";
const LABEL_BAYAR: Record<string, string> = { unpaid: "Belum bayar", dp_paid: "Sudah DP", lunas: "Lunas" };
const inp = "mt-1 block w-full rounded border border-slate-300 p-2";

export default async function DetailTransaksiPage({
  params, searchParams,
}: {
  params: Promise<{ kode: string }>;
  searchParams: Promise<{ error?: string; ok?: string; ref?: string; bulan?: string }>;
}) {
  const { kode } = await params;
  const { error, ok, ref, bulan } = await searchParams;
  const d = await getDetailTransaksi(kode);
  if (!d) notFound();
  const items = await getBookingItems(d.id);

  const dariJadwal = ref === "jadwal";
  const backHref = dariJadwal ? `/admin/schedule${bulan ? `?bulan=${bulan}` : ""}` : "/admin/transaksi";
  const backLabel = dariJadwal ? "← Jadwal" : "← Transaksi";

  const [paket, sesi] = await Promise.all([listPaket(), listSesi()]);
  const pay = d.payment;
  const status = pay?.status_bayar ?? "unpaid";
  const total = pay?.total ?? 0;
  const ongkos = pay?.ongkos ?? 0;
  const diskon = pay?.diskon ?? 0;
  const tagihan = total + ongkos - diskon;
  const dp = pay?.dp_amount ?? 0;
  const sisa = status === "lunas" ? 0 : Math.max(0, tagihan - dp);
  const curTahap = d.status_pengerjaan ?? "";

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Detail Transaksi</h1>
        <Link href={backHref} className="text-sm text-slate-500 underline">{backLabel}</Link>
      </div>

      {ok && <p className="mt-3 rounded border border-green-300 bg-green-50 p-2 text-sm text-green-700">Perubahan tersimpan.</p>}
      {error && <p className="mt-3 rounded border border-red-300 bg-red-50 p-2 text-sm text-red-700">{error}</p>}

      <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
        <p className="font-mono text-lg font-bold">{d.kode_booking}</p>
        <dl className="mt-3 grid grid-cols-3 gap-y-2 text-sm">
          <dt className="text-slate-500">Customer</dt><dd className="col-span-2">{d.profile?.nama ?? "Member"} · {d.profile?.no_wa ?? "-"}</dd>
          <dt className="text-slate-500">Email</dt><dd className="col-span-2">{d.profile?.email ?? "-"}</dd>
          <dt className="text-slate-500">Anak</dt><dd className="col-span-2">{d.anak_nama} · {d.anak_bb} kg · {d.anak_jk}</dd>
          <dt className="text-slate-500">Lokasi</dt><dd className="col-span-2">{d.lokasi_sesi === "home" ? `Home${d.zona ? ` · ${d.zona.nama}` : ""}${d.alamat_sesi ? ` · ${d.alamat_sesi}` : ""}` : "Di Studio"}</dd>
          <dt className="text-slate-500">Layanan</dt><dd className="col-span-2">{d.package?.layanan?.nama ?? "-"}</dd>
          <dt className="text-slate-500">Paket</dt><dd className="col-span-2">{d.package?.nama ?? "-"}</dd>
          {items.length > 0 && (
            <>
              <dt className="text-slate-500">Item</dt>
              <dd className="col-span-2">
                {items.map((it, i) => (
                  <div key={i}>{it.nama} × {it.qty} = {formatRupiah(it.harga * it.qty)}</div>
                ))}
              </dd>
            </>
          )}
          <dt className="text-slate-500">Jadwal</dt><dd className="col-span-2">{d.tanggal} · {d.sesi?.nama ?? ""} ({d.jam_mulai.slice(0, 5)})</dd>
          <dt className="text-slate-500">Paket</dt><dd className="col-span-2">{formatRupiah(total)}</dd>
          <dt className="text-slate-500">Ongkos</dt><dd className="col-span-2">{formatRupiah(ongkos)}</dd>
          <dt className="text-slate-500">Diskon</dt><dd className="col-span-2">{formatRupiah(diskon)}</dd>
          <dt className="text-slate-500">Total</dt><dd className="col-span-2 font-semibold">{formatRupiah(tagihan)}</dd>
          <dt className="text-slate-500">DP</dt><dd className="col-span-2">{formatRupiah(dp)}</dd>
          <dt className="text-slate-500">Sisa</dt><dd className="col-span-2">{formatRupiah(sisa)}</dd>
          <dt className="text-slate-500">Status bayar</dt><dd className="col-span-2">{LABEL_BAYAR[status] ?? status}</dd>
        </dl>
        {d.bukti_signed_url && (
          <a href={d.bukti_signed_url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block rounded border border-slate-300 px-3 py-1.5 text-sm">Lihat bukti TF</a>
        )}
      </div>

      {/* Pembayaran: override ongkos/diskon + status (DP dihitung ulang) */}
      <form action={simpanDetailTransaksi} className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="font-semibold text-slate-700">Pembayaran</h2>
        <input type="hidden" name="bookingId" value={d.id} />
        <input type="hidden" name="paymentId" value={pay?.id ?? ""} />
        <input type="hidden" name="kode" value={d.kode_booking} />
        {dariJadwal && <input type="hidden" name="ref" value="jadwal" />}
        {dariJadwal && bulan && <input type="hidden" name="bulan" value={bulan} />}
        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="block text-sm">Ongkos (Rp)<input type="number" name="ongkos" defaultValue={ongkos} min={0} className={inp} /></label>
          <label className="block text-sm">Diskon (Rp)<input type="number" name="diskon" defaultValue={diskon} min={0} className={inp} /></label>
        </div>
        <label className="mt-3 block text-sm">Nominal DP (Rp)
          <input type="number" name="dp_amount" defaultValue={dp || ""} min={0} placeholder="Kosongkan = auto 30%" className={inp} />
        </label>
        <label className="mt-3 block text-sm">Status pembayaran
          <select name="status" defaultValue={status} className={inp}>
            <option value="unpaid">Belum bayar</option><option value="dp_paid">Sudah DP</option><option value="lunas">Lunas</option>
          </select>
        </label>
        <p className="mt-2 text-xs text-slate-400">DP bisa diisi manual. Dikosongkan = dihitung otomatis (paket + ongkos − diskon) × {d.package?.dp_persen ?? 30}%.</p>
        <button className="mt-3 h-10 rounded bg-slate-800 px-4 text-sm text-white">Simpan</button>
      </form>

      {/* Status pengerjaan */}
      <form action={updateStatusPengerjaan} className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="font-semibold text-slate-700">Status Pengerjaan</h2>
        <input type="hidden" name="bookingId" value={d.id} />
        <input type="hidden" name="kode" value={d.kode_booking} />
        {dariJadwal && <input type="hidden" name="ref" value="jadwal" />}
        {dariJadwal && bulan && <input type="hidden" name="bulan" value={bulan} />}
        <select name="status_pengerjaan" defaultValue={curTahap} className={inp}>
          <option value="">Belum mulai</option>
          {TAHAP_PENGERJAAN.map((t) => <option key={t} value={t}>{LABEL_PENGERJAAN[t]}</option>)}
        </select>
        <input
          name="drive_url"
          type="url"
          defaultValue={d.drive_url ?? ""}
          placeholder="Link Google Drive hasil foto"
          className={inp}
        />
        <button className="mt-3 h-10 rounded bg-slate-800 px-4 text-sm text-white">Simpan Status</button>
      </form>

      {/* Reschedule */}
      <form action={rescheduleBooking} className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="font-semibold text-slate-700">Reschedule</h2>
        <input type="hidden" name="bookingId" value={d.id} />
        <input type="hidden" name="kode" value={d.kode_booking} />
        {dariJadwal && <input type="hidden" name="ref" value="jadwal" />}
        {dariJadwal && bulan && <input type="hidden" name="bulan" value={bulan} />}
        <label className="mt-3 block text-sm">Paket
          <select name="packageId" defaultValue={d.package_id} className={inp}>
            {paket.filter((p) => p.is_active).map((p) => <option key={p.id} value={p.id}>{p.nama}</option>)}
          </select>
        </label>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="block text-sm">Tanggal<input type="date" name="tanggal" defaultValue={d.tanggal} className={inp} /></label>
          <label className="block text-sm">Sesi
            <select name="sesiId" defaultValue={d.sesi_id} className={inp}>
              {sesi.filter((s) => s.is_active).map((s) => <option key={s.id} value={s.id}>{s.nama} ({s.jam_mulai.slice(0, 5)})</option>)}
            </select>
          </label>
        </div>
        <button className="mt-3 h-10 rounded bg-slate-800 px-4 text-sm text-white">Simpan Reschedule</button>
      </form>

      {/* Invoice */}
      <div className="mt-4 flex flex-wrap gap-2">
        <a href={`/invoice/${d.kode_booking}`} target="_blank" rel="noopener noreferrer" className="h-10 rounded border border-slate-300 px-4 text-sm leading-10">Cetak Invoice</a>
        <KirimInvoiceWA
          noWa={d.package?.layanan?.admin_wa ?? ""}
          kode={d.kode_booking}
          layanan={d.package?.layanan?.nama ?? "-"}
          paket={d.package?.nama ?? "-"}
          tanggal={d.tanggal}
          sesi={d.sesi?.nama ?? ""}
          total={tagihan}
          status={LABEL_BAYAR[status] ?? status}
        />
      </div>
    </main>
  );
}
