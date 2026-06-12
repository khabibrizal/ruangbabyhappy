import Link from "next/link";
import { notFound } from "next/navigation";
import { getMyBookingDetail } from "@/lib/member/queries";
import { buildWaLink } from "@/lib/booking/waLink";
import { formatRupiah } from "@/lib/format/rupiah";
import { indexTahap } from "@/lib/booking/statusPengerjaan";
import Stepper from "../Stepper";

export const dynamic = "force-dynamic";
const LABEL: Record<string, string> = { unpaid: "Belum bayar", dp_paid: "DP terbayar", lunas: "Lunas" };

export default async function MemberDetailPage({ params }: { params: Promise<{ kode: string }> }) {
  const { kode } = await params;
  const b = await getMyBookingDetail(kode);
  if (!b) notFound();

  const status = b.payment?.status_bayar ?? "unpaid";
  const total = b.payment?.total ?? 0;
  const tagihan = total + (b.payment?.ongkos ?? 0) - (b.payment?.diskon ?? 0);
  const dp = b.payment?.dp_amount ?? 0;
  const sisa = status === "lunas" ? 0 : Math.max(0, tagihan - dp);
  const waUrl = buildWaLink(b.package?.layanan?.admin_wa ?? "", {
    kode: b.kode_booking, layanan: b.package?.layanan?.nama ?? "-", paket: b.package?.nama ?? "-",
    tanggal: b.tanggal, sesi: b.sesi?.nama ?? "",
  });

  return (
    <main className="mx-auto w-full max-w-md px-4 py-8 sm:px-6">
      <Link href="/member" className="text-sm text-slate-500 underline">← Transaksi</Link>
      <h1 className="mt-3 font-display text-2xl font-extrabold">{b.kode_booking}</h1>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="text-sm font-bold text-slate-600">Status Pengerjaan</div>
        <Stepper status={b.status_pengerjaan} />
        {indexTahap(b.status_pengerjaan) >= 0 && b.drive_url && (
          <a href={b.drive_url} target="_blank" rel="noreferrer" className="mt-3 block rounded-full bg-grad py-2.5 text-center text-sm font-bold text-white">Download Foto</a>
        )}
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-y-1.5 rounded-2xl border border-slate-200 bg-white p-4 text-sm font-semibold">
        <dt className="text-slate-500">Layanan</dt><dd className="text-right">{b.package?.layanan?.nama ?? "-"}</dd>
        <dt className="text-slate-500">Paket</dt><dd className="text-right">{b.package?.nama ?? "-"}</dd>
        <dt className="text-slate-500">Jadwal</dt><dd className="text-right">{b.tanggal} · {b.sesi?.nama ?? ""}</dd>
        <dt className="text-slate-500">Lokasi</dt><dd className="text-right">{b.lokasi_sesi === "home" ? `Home${b.zona ? ` · ${b.zona.nama}` : ""}` : "Di Studio"}</dd>
        <dt className="text-slate-500">Anak</dt><dd className="text-right">{b.anak_nama} · {b.anak_bb}kg · {b.anak_jk}</dd>
      </dl>

      <dl className="mt-3 grid grid-cols-2 gap-y-1.5 rounded-2xl border border-slate-200 bg-white p-4 text-sm font-semibold">
        <dt className="text-slate-500">Paket</dt><dd className="text-right">{formatRupiah(total)}</dd>
        {(b.payment?.ongkos ?? 0) > 0 && (<><dt className="text-slate-500">Home Service</dt><dd className="text-right">{formatRupiah(b.payment?.ongkos)}</dd></>)}
        {(b.payment?.diskon ?? 0) > 0 && (<><dt className="text-emerald-600">Diskon</dt><dd className="text-right text-emerald-600">−{formatRupiah(b.payment?.diskon)}</dd></>)}
        <dt className="text-slate-500">Total</dt><dd className="text-right font-extrabold">{formatRupiah(tagihan)}</dd>
        <dt className="text-slate-500">DP</dt><dd className="text-right">{formatRupiah(dp)}</dd>
        <dt className="text-slate-500">Sisa</dt><dd className="text-right">{formatRupiah(sisa)}</dd>
        <dt className="text-slate-500">Status bayar</dt><dd className="text-right">{LABEL[status] ?? status}</dd>
      </dl>

      {b.package?.layanan?.bank && (
        <p className="mt-3 rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-600">
          Transfer ke: <span className="font-bold">{b.package.layanan.bank} {b.package.layanan.no_rek}</span> a.n. {b.package.layanan.atas_nama}
        </p>
      )}

      <div className="mt-4 flex gap-2">
        <a href={`/invoice/${b.kode_booking}`} target="_blank" rel="noreferrer" className="flex-1 rounded-full bg-white py-2.5 text-center text-sm font-bold ring-1 ring-black/10">Invoice</a>
        <a href={waUrl} target="_blank" rel="noreferrer" className="flex-1 rounded-full bg-green-500 py-2.5 text-center text-sm font-bold text-white">Chat Admin</a>
      </div>
    </main>
  );
}
