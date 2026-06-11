import Link from "next/link";
import { listJadwalBulan, type JadwalItem } from "@/lib/booking/queries";

export const dynamic = "force-dynamic";

const NAMA_BULAN = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
const HARI = ["Sen","Sel","Rab","Kam","Jum","Sab","Min"];
const WARNA: Record<string, string> = {
  unpaid: "bg-red-100 text-red-700 hover:bg-red-200",
  dp_paid: "bg-amber-100 text-amber-800 hover:bg-amber-200",
  lunas: "bg-green-100 text-green-700 hover:bg-green-200",
};

function normalisasiBulan(raw: string | undefined): string {
  if (raw && /^\d{4}-\d{2}$/.test(raw)) return raw;
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}
function geserBulan(bulan: string, delta: number): string {
  const [y, m] = bulan.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default async function SchedulePage({ searchParams }: { searchParams: Promise<{ bulan?: string }> }) {
  const { bulan: bulanParam } = await searchParams;
  const bulan = normalisasiBulan(bulanParam);
  const [tahun, bulanNo] = bulan.split("-").map(Number);

  const items = await listJadwalBulan(bulan);
  const perTanggal = new Map<string, JadwalItem[]>();
  for (const it of items) {
    const list = perTanggal.get(it.tanggal) ?? [];
    list.push(it);
    perTanggal.set(it.tanggal, list);
  }

  const jumlahHari = new Date(tahun, bulanNo, 0).getDate();
  const offsetAwal = (new Date(tahun, bulanNo - 1, 1).getDay() + 6) % 7;
  const totalBaris = Math.ceil((offsetAwal + jumlahHari) / 7) * 7;

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Jadwal</h1>
        <Link href="/admin" className="text-sm text-slate-500 underline">← Dashboard</Link>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <Link href={`/admin/schedule?bulan=${geserBulan(bulan, -1)}`} className="flex h-10 items-center rounded border border-slate-300 px-3 text-sm">← Bulan lalu</Link>
        <h2 className="text-lg font-semibold">{NAMA_BULAN[bulanNo - 1]} {tahun}</h2>
        <Link href={`/admin/schedule?bulan=${geserBulan(bulan, 1)}`} className="flex h-10 items-center rounded border border-slate-300 px-3 text-sm">Bulan depan →</Link>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 text-sm">
        {HARI.map((h) => <div key={h} className="bg-slate-50 py-2 text-center font-medium text-slate-600">{h}</div>)}
        {Array.from({ length: totalBaris }).map((_, idx) => {
          const hari = idx - offsetAwal + 1;
          if (hari < 1 || hari > jumlahHari) return <div key={idx} className="min-h-24 bg-slate-50" />;
          const key = `${bulan}-${String(hari).padStart(2, "0")}`;
          const isi = perTanggal.get(key) ?? [];
          return (
            <div key={idx} className="min-h-24 bg-white p-1.5">
              <div className="text-right text-xs text-slate-400">{hari}</div>
              <div className="mt-1 flex flex-col gap-1">
                {isi.map((it) => (
                  <Link key={it.kode_booking} href={`/admin/transaksi/${it.kode_booking}?ref=jadwal&bulan=${bulan}`}
                    title={`${it.nama} · ${it.sesi_nama}`}
                    className={`block truncate rounded px-1.5 py-0.5 text-xs transition-colors ${WARNA[it.status_bayar] ?? "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>
                    {it.sesi_nama}: {it.nama}
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-600">
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-red-100" /> Belum bayar</span>
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-amber-100" /> Sudah DP</span>
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-green-100" /> Lunas</span>
      </div>
    </main>
  );
}
