import Link from "next/link";
import { notFound } from "next/navigation";
import PublicShell from "@/components/public/PublicShell";
import { getBookingByKode } from "@/lib/booking/queries";
import { buildWaLink } from "@/lib/booking/waLink";
import { formatRupiah } from "@/lib/format/rupiah";

const LABEL: Record<string, string> = { unpaid: "Belum bayar", dp_paid: "DP terbayar", lunas: "Lunas" };

export default async function KonfirmasiPage({
  params,
}: {
  params: Promise<{ kode: string }>;
}) {
  const { kode } = await params;
  const b = await getBookingByKode(kode);
  if (!b) notFound();

  const status = b.payment?.status_bayar ?? "unpaid";
  const total = b.payment?.total ?? 0;
  const tagihan = total + (b.payment?.ongkos ?? 0) - (b.payment?.diskon ?? 0);
  const dp = b.payment?.dp_amount ?? 0;

  const waUrl = buildWaLink(b.layanan_admin_wa, {
    kode: b.kode_booking,
    layanan: b.layanan_nama,
    paket: b.package?.nama ?? "-",
    tanggal: b.tanggal,
    sesi: b.sesi?.nama ?? "",
  });

  return (
    <PublicShell>
      <main className="grad-soft min-h-[70vh]">
        <div className="mx-auto w-full max-w-md px-4 py-12 sm:px-6">
          <h1 className="font-display text-2xl font-extrabold">Booking Diterima 🎉</h1>
          <p className="mt-1 text-sm font-semibold text-foreground/60">
            Bukti transfer terkirim & menunggu verifikasi admin. Simpan kode ini.
          </p>

          <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
            <p className="font-display text-2xl font-extrabold text-grad">{b.kode_booking}</p>
            <dl className="mt-3 grid grid-cols-2 gap-y-1.5 text-sm font-semibold">
              <dt className="text-foreground/50">Layanan</dt><dd className="text-right">{b.layanan_nama}</dd>
              <dt className="text-foreground/50">Paket</dt><dd className="text-right">{b.package?.nama ?? "-"}</dd>
              <dt className="text-foreground/50">Jadwal</dt><dd className="text-right">{b.tanggal} · {b.sesi?.nama}</dd>
              <dt className="text-foreground/50">Lokasi</dt><dd className="text-right">{b.lokasi_sesi === "home" ? `Home${b.zona ? ` · ${b.zona.nama}` : ""}` : "Di Studio"}</dd>
              <dt className="text-foreground/50">Anak</dt><dd className="text-right">{b.anak_nama} · {b.anak_bb}kg · {b.anak_jk}</dd>
            </dl>
            <div className="mt-3 border-t border-dashed border-black/10 pt-2 text-sm font-semibold">
              <div className="flex justify-between"><span className="text-foreground/50">Paket</span><span>{formatRupiah(total)}</span></div>
              {(b.payment?.ongkos ?? 0) > 0 && <div className="flex justify-between"><span className="text-foreground/50">Home Service</span><span>{formatRupiah(b.payment?.ongkos)}</span></div>}
              {(b.payment?.diskon ?? 0) > 0 && <div className="flex justify-between text-emerald-600"><span>Diskon</span><span>−{formatRupiah(b.payment?.diskon)}</span></div>}
              <div className="flex justify-between font-extrabold"><span>Total</span><span>{formatRupiah(tagihan)}</span></div>
              <div className="flex justify-between text-pink-500"><span>DP — transfer</span><span className="font-bold">{formatRupiah(dp)}</span></div>
              <div className="flex justify-between"><span className="text-foreground/50">Status</span><span>{LABEL[status] ?? status}</span></div>
            </div>
          </div>

          {b.layanan_bank && (
            <div className="mt-4 rounded-2xl bg-white p-4 text-sm font-semibold shadow-sm">
              <div className="text-foreground/50">Transfer ke:</div>
              <div className="font-bold">{b.layanan_bank} {b.layanan_no_rek} a.n. {b.layanan_atas_nama}</div>
            </div>
          )}

          <a href={waUrl} target="_blank" rel="noopener noreferrer"
            className="mt-4 flex h-12 items-center justify-center rounded-full bg-green-500 px-4 font-bold text-white shadow-lg hover:bg-green-600">
            💬 Chat Admin via WA
          </a>
          <Link href="/member" className="mt-3 block text-center text-sm font-semibold text-foreground/50 underline">
            Lihat di dashboard saya
          </Link>
        </div>
      </main>
    </PublicShell>
  );
}
