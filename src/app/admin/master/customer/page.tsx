import Link from "next/link";
import { listCustomers, CUSTOMER_PER_PAGE } from "@/lib/booking/queries";

export const dynamic = "force-dynamic";

export default async function MasterCustomerPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q = "", page: pageRaw } = await searchParams;
  const page = Math.max(1, Number(pageRaw) || 1);

  const { rows: customers, total } = await listCustomers({ q, page });
  const totalPages = Math.max(1, Math.ceil(total / CUSTOMER_PER_PAGE));

  // Bangun querystring tanpa nilai kosong.
  const qs = (o: Record<string, string | number | undefined>) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(o)) if (v !== undefined && v !== "" && v !== null) sp.set(k, String(v));
    const s = sp.toString();
    return s ? `?${s}` : "";
  };
  // Klik customer -> pindah ke halaman detail, bawa konteks pencarian/halaman utk tombol balik.
  const linkCustomer = (id: string) => `/admin/master/customer/${id}${qs({ q, page })}`;
  const linkPage = (n: number) => `/admin/master/customer${qs({ q, page: n })}`;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Master Customer</h1>
        <Link href="/admin/master" className="text-sm text-slate-500 underline">← Master</Link>
      </div>

      {/* Pencarian by nama / no telp (kosongkan = tampil semua) */}
      <form method="get" className="mt-4 flex gap-2 rounded-lg border border-slate-200 bg-white p-4">
        <input
          name="q"
          defaultValue={q}
          placeholder="Cari nama atau no. telepon… (kosongkan = semua)"
          className="flex-1 rounded border border-slate-300 p-2 text-sm"
        />
        <button className="h-10 rounded bg-slate-800 px-4 text-sm text-white">Cari</button>
        {q && (
          <Link href="/admin/master/customer" className="flex h-10 items-center rounded border border-slate-300 px-4 text-sm text-slate-600">
            Reset
          </Link>
        )}
      </form>

      {/* Daftar customer (default: semua, 10/halaman) */}
      <div className="mt-4">
        <p className="text-xs text-slate-400">
          {total} customer{q ? ` cocok dengan "${q}"` : ""} · halaman {page}/{totalPages}
        </p>
        <div className="mt-2 flex flex-col gap-2">
          {customers.map((c) => (
            <Link
              key={c.id}
              href={linkCustomer(c.id)}
              className="rounded border border-slate-200 bg-white p-3 text-sm hover:bg-slate-50"
            >
              <span className="font-semibold text-slate-800">{c.nama ?? "(tanpa nama)"}</span>
              <span className="text-slate-500"> · {c.no_wa ?? "-"}</span>
              {(c.ig || c.email) && (
                <div className="text-xs text-slate-400">{[c.ig ? `IG: ${c.ig}` : null, c.email].filter(Boolean).join(" · ")}</div>
              )}
            </Link>
          ))}
          {customers.length === 0 && <p className="text-sm text-slate-400">Tidak ada customer.</p>}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            {page > 1 ? (
              <Link href={linkPage(page - 1)} className="rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">← Sebelumnya</Link>
            ) : (
              <span className="rounded border border-slate-200 px-3 py-1.5 text-sm text-slate-300">← Sebelumnya</span>
            )}
            <span className="text-xs text-slate-400">{page} / {totalPages}</span>
            {page < totalPages ? (
              <Link href={linkPage(page + 1)} className="rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">Berikutnya →</Link>
            ) : (
              <span className="rounded border border-slate-200 px-3 py-1.5 text-sm text-slate-300">Berikutnya →</span>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
