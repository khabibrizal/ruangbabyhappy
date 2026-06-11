import { TAHAP_PENGERJAAN, LABEL_PENGERJAAN, indexTahap } from "@/lib/booking/statusPengerjaan";

export default function Stepper({ status }: { status: string | null }) {
  const aktif = indexTahap(status);
  if (aktif < 0) {
    return <div className="mt-2 rounded-xl bg-slate-50 p-2 text-center text-xs font-bold text-slate-400">⏳ Menunggu sesi foto</div>;
  }
  return (
    <div className="mt-2 rounded-xl bg-slate-50 p-3">
      <div className="flex items-center justify-between">
        {TAHAP_PENGERJAAN.map((t, i) => (
          <div key={t} className="flex flex-1 flex-col items-center">
            <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
              i < aktif ? "bg-pink-400 text-white" : i === aktif ? "bg-pink-500 text-white ring-4 ring-pink-200" : "bg-slate-200 text-slate-500"
            }`}>{i < aktif ? "✓" : i + 1}</div>
            <div className={`mt-1 text-center text-[9px] font-bold ${i === aktif ? "text-pink-600" : "text-slate-400"}`}>
              {LABEL_PENGERJAAN[t]}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
