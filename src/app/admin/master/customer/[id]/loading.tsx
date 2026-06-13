// Skeleton fallback utk transisi ke halaman detail customer (force-dynamic).
// Meniru layout DetailCustomerPage (kartu profil + kartu riwayat transaksi)
// supaya saat klik dari daftar langsung muncul kerangka, lalu di-swap mulus
// begitu auth + query selesai (tanpa pergeseran layout).
const bar = "animate-pulse rounded bg-slate-200";

function FieldSkeleton() {
  return (
    <div className="text-sm">
      <div className={`${bar} h-3 w-20`} />
      <div className={`${bar} mt-1 h-9 w-full`} />
    </div>
  );
}

export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6" aria-busy="true" aria-label="Memuat detail customer">
      <div className="flex items-center justify-between">
        <div className={`${bar} h-6 w-44`} />
        <div className={`${bar} h-4 w-28`} />
      </div>

      {/* Kartu Edit Profil Customer */}
      <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
        <div className={`${bar} h-5 w-40`} />
        <div className="mt-3 grid grid-cols-2 gap-3">
          <FieldSkeleton />
          <FieldSkeleton />
          <FieldSkeleton />
          <FieldSkeleton />
          <FieldSkeleton />
        </div>
        <div className={`${bar} mt-3 h-10 w-28`} />
      </div>

      {/* Kartu Riwayat Transaksi */}
      <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
        <div className={`${bar} h-5 w-48`} />
        <ul className="mt-3 divide-y divide-slate-100">
          {Array.from({ length: 3 }).map((_, i) => (
            <li key={i} className="flex items-center justify-between gap-3 py-2.5">
              <span className="w-full">
                <div className={`${bar} h-4 w-40`} />
                <div className={`${bar} mt-1.5 h-3 w-56`} />
              </span>
              <span className="shrink-0 text-right">
                <div className={`${bar} h-4 w-20`} />
                <div className={`${bar} mt-1.5 h-3 w-14`} />
              </span>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
