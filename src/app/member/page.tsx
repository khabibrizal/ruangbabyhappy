import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { getMyBookings } from "@/lib/member/queries";
import { formatRupiah } from "@/lib/format/rupiah";
import { indexTahap } from "@/lib/booking/statusPengerjaan";
import Stepper from "./Stepper";

export const dynamic = "force-dynamic";

const LABEL_BAYAR: Record<string, string> = { unpaid: "Belum bayar", dp_paid: "DP terbayar", lunas: "Lunas" };

export default async function MemberPage() {
  const profile = await getCurrentProfile();
  const bookings = await getMyBookings();

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold">Halo, {profile?.nama ?? "Member"} 👋</h1>
          <p className="mt-1 text-sm text-slate-500">Riwayat booking & status pengerjaan fotomu.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/member/ganti-password" className="rounded-full bg-white px-4 py-2 text-sm font-bold ring-1 ring-black/10">Ganti Password</Link>
          <form action="/logout" method="post">
            <button className="rounded-full bg-white px-4 py-2 text-sm font-bold ring-1 ring-black/10">Keluar</button>
          </form>
        </div>
      </div>

      <Link href="/" className="mt-4 inline-block rounded-full bg-grad px-4 py-2 text-sm font-bold text-white">+ Booking Baru</Link>

      <h2 className="mt-6 text-lg font-bold">Booking Saya</h2>
      {bookings.length === 0 ? (
        <p className="mt-2 text-slate-500">Belum ada booking.</p>
      ) : (
        <div className="mt-3 flex flex-col gap-3">
          {bookings.map((b) => {
            const pay = b.payment;
            const status = pay?.status_bayar ?? "unpaid";
            const tagihan = (pay?.total ?? 0) + (pay?.ongkos ?? 0) - (pay?.diskon ?? 0);
            return (
              <div key={b.kode_booking} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-mono font-bold">{b.kode_booking}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold">{LABEL_BAYAR[status] ?? status}</span>
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  {b.package?.layanan?.nama ? `${b.package.layanan.nama} · ` : ""}{b.package?.nama ?? "-"} · {b.tanggal} · {b.sesi?.nama ?? ""}
                </p>
                <p className="text-xs text-slate-400">{b.lokasi_sesi === "home" ? "Home Service" : "Di Studio"} · {b.anak_nama} · Total {formatRupiah(tagihan)}</p>
                <Stepper status={b.status_pengerjaan} />
                <div className="mt-3 flex gap-2 text-xs font-bold">
                  <Link href={`/member/${b.kode_booking}`} className="rounded-full bg-white px-3 py-1.5 ring-1 ring-black/10">Detail</Link>
                  <a href={`/invoice/${b.kode_booking}`} target="_blank" rel="noreferrer" className="rounded-full bg-white px-3 py-1.5 ring-1 ring-black/10">Invoice</a>
                  {indexTahap(b.status_pengerjaan) >= 0 && b.drive_url && (
                    <a href={b.drive_url} target="_blank" rel="noreferrer" className="rounded-full bg-grad px-3 py-1.5 text-white">Download Foto</a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
