import Link from "next/link";

export default function AdminHome() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold text-slate-800">Panel Admin</h1>
      <p className="mt-2 text-slate-500">Kelola data & transaksi Ruang Baby Happy.</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link href="/admin/master" className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-bold text-white">Master Data</Link>
        <span className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-400">Transaksi (Plan 4)</span>
      </div>
      <form action="/logout" method="post" className="mt-6">
        <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700">Keluar</button>
      </form>
    </main>
  );
}
