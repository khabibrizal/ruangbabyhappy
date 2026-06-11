export default function AdminHome() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold text-slate-800">Panel Admin</h1>
      <p className="mt-2 text-slate-500">Master data & transaksi menyusul (Plan 2 &amp; 4).</p>
      <form action="/logout" method="post" className="mt-4">
        <button className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-bold text-white">Keluar</button>
      </form>
    </main>
  );
}
