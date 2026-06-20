import Link from "next/link";
import { notFound } from "next/navigation";
import { getDetailTransaksi } from "@/lib/booking/queries";
import { getBookingItems } from "@/lib/booking/queries";
import { simpanDetailTransaksi, updateStatusPengerjaan, rescheduleBooking, tambahItemTransaksi, hapusItemTransaksi } from "@/lib/booking/adminPayment";
import { listPaket, listSesi } from "@/lib/admin/masterQueries";
import { formatRupiah } from "@/lib/format/rupiah";
import { TAHAP_PENGERJAAN, LABEL_PENGERJAAN } from "@/lib/booking/statusPengerjaan";
import AksiWa from "@/components/ui/AksiWa";
import { buildPesanWa, buildRekening, type StatusBayar } from "@/lib/booking/waPesan";
import { buildReminderSesi } from "@/lib/booking/waReminder";
import SubmitButton from "@/components/ui/SubmitButton";

export const dynamic = "force-dynamic";
const LABEL_BAYAR: Record<string, string> = { unpaid: "Belum bayar", dp_paid: "Sudah DP", lunas: "Lunas" };
const inp = "mt-1 block w-full rounded border border-slate-300 p-2";

export default async function DetailTransaksiPage({
  params, searchParams,
}: {
  params: Promise<{ kode: string }>;
  searchParams: Promise<{ ref?: string; bulan?: string }>;
}) {
  const { kode } = await params;
  const { ref, bulan } = await searchParams;
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

      <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
        <p className="font-mono text-lg font-bold">{d.kode_booking}</p>
        <dl className="mt-3 grid grid-cols-3 gap-y-2 text-sm">
          <dt className="text-slate-500">Customer</dt><dd className="col-span-2">{d.profile?.nama ?? "Member"} · {d.profile?.no_wa ?? "-"}</dd>
          <dt className="text-slate-500">Email</dt><dd className="col-span-2">{d.profile?.email ?? "-"}</dd>
          <dt className="text-slate-500">Anak</dt><dd className="col-span-2">{d.anak_nama} · {d.anak_bb} kg · {d.anak_jk}</dd>
          <dt className="text-slate-500">Lokasi</dt><dd className="col-span-2">{d.lokasi_sesi === "home" ? `Home${d.zona ? ` · ${d.zona.nama}` : ""}${d.alamat_sesi ? ` · ${d.alamat_sesi}` : ""}` : "Di Studio"}</dd>
          <dt className="text-slate-500">Layanan</dt><dd className="col-span-2">{d.package?.layanan?.nama ?? "-"}</dd>
          <dt className="text-slate-500">Paket</dt><dd className="col-span-2">{d.package?.nama ?? "-"}</dd>
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

      {/* Item transaksi: tambah / hapus paket. Total header dihitung ulang otomatis. */}
      <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="font-semibold text-slate-700">Item Transaksi</h2>
        <ul className="mt-3 divide-y divide-slate-100">
          {items.map((it) => (
            <li key={it.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <span>{it.nama} × {it.qty} = <span className="font-medium">{formatRupiah(it.harga * it.qty)}</span></span>
              <form action={hapusItemTransaksi}>
                <input type="hidden" name="itemId" value={it.id} />
                <input type="hidden" name="bookingId" value={d.id} />
                <input type="hidden" name="paymentId" value={pay?.id ?? ""} />
                <input type="hidden" name="kode" value={d.kode_booking} />
                {dariJadwal && <input type="hidden" name="ref" value="jadwal" />}
                {dariJadwal && bulan && <input type="hidden" name="bulan" value={bulan} />}
                <SubmitButton className="rounded border border-red-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50">Hapus</SubmitButton>
              </form>
            </li>
          ))}
          {items.length === 0 && <li className="py-2 text-sm text-slate-400">Belum ada item.</li>}
        </ul>
        <p className="mt-2 text-right text-sm text-slate-500">Subtotal item: <span className="font-semibold text-slate-700">{formatRupiah(total)}</span></p>

        <form action={tambahItemTransaksi} className="mt-3 flex flex-wrap items-end gap-2 border-t border-slate-100 pt-3">
          <input type="hidden" name="bookingId" value={d.id} />
          <input type="hidden" name="paymentId" value={pay?.id ?? ""} />
          <input type="hidden" name="kode" value={d.kode_booking} />
          {dariJadwal && <input type="hidden" name="ref" value="jadwal" />}
          {dariJadwal && bulan && <input type="hidden" name="bulan" value={bulan} />}
          <label className="flex-1 text-sm">Tambah paket
            <select name="packageId" className={inp} required defaultValue="">
              <option value="" disabled>Pilih paket…</option>
              {paket.filter((p) => p.is_active).map((p) => (
                <option key={p.id} value={p.id}>{p.nama} ({formatRupiah(p.harga)})</option>
              ))}
            </select>
          </label>
          <label className="w-20 text-sm">Qty
            <input type="number" name="qty" defaultValue={1} min={1} className={inp} />
          </label>
          <SubmitButton className="h-10 rounded bg-slate-800 px-4 text-sm text-white">Tambah</SubmitButton>
        </form>
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
        <SubmitButton className="mt-3 h-10 rounded bg-slate-800 px-4 text-sm text-white">Simpan</SubmitButton>
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
        <SubmitButton className="mt-3 h-10 rounded bg-slate-800 px-4 text-sm text-white">Simpan Status</SubmitButton>
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
        <SubmitButton className="mt-3 h-10 rounded bg-slate-800 px-4 text-sm text-white">Simpan Reschedule</SubmitButton>
      </form>

      {/* Reminder sesi (WA) — pengingat jadwal + persiapan ke customer */}
      <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="font-semibold text-slate-700">Reminder Sesi (WA)</h2>
        <p className="mt-1 text-xs text-slate-400">
          Kirim pengingat jadwal & persiapan ke customer (otomatis sesuai layanan: {d.package?.layanan?.nama ?? "-"}).
        </p>
        <div className="mt-3">
          <AksiWa
            noWa={d.profile?.no_wa ?? ""}
            teks={buildReminderSesi({
              nama: d.profile?.nama ?? "Kak",
              layanan: d.package?.layanan?.nama ?? "",
              tanggal: d.tanggal,
              jam: d.jam_mulai.slice(0, 5),
            })}
          />
        </div>
      </div>

      {/* Invoice */}
      <div className="mt-4 flex flex-wrap gap-2">
        <a href={`/invoice/${d.kode_booking}`} target="_blank" rel="noopener noreferrer" className="h-10 rounded border border-slate-300 px-4 text-sm leading-10">Cetak Invoice</a>
        <AksiWa
          noWa={d.profile?.no_wa ?? ""}
          teks={buildPesanWa({
            nama: d.profile?.nama ?? "Kak",
            kode: d.kode_booking,
            rincian:
              `Layanan: ${d.package?.layanan?.nama ?? "-"}\n` +
              `Paket: ${d.package?.nama ?? "-"}\n` +
              `Jadwal: ${d.tanggal} (${d.sesi?.nama ?? ""})`,
            total: tagihan,
            sisa,
            statusKey: status as StatusBayar,
            rekening: buildRekening(d.package?.layanan),
          })}
          invoicePath={`/invoice/${d.kode_booking}`}
        />
      </div>
    </main>
  );
}
