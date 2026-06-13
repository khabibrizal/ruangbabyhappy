import Link from "next/link";
import { simpanProfilCustomer } from "@/lib/admin/customerSearch";
import {
  listCustomers,
  getProfileById,
  listTransaksiByCustomer,
  CUSTOMER_PER_PAGE,
} from "@/lib/booking/queries";
import { formatRupiah } from "@/lib/format/rupiah";

export const dynamic = "force-dynamic";
const inp = "mt-1 block w-full rounded border border-slate-300 p-2 text-sm";
const LABEL_BAYAR: Record<string, string> = { unpaid: "Belum bayar", dp_paid: "Sudah DP", lunas: "Lunas" };

export default async function MasterCustomerPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; profileId?: string; page?: string }>;
}) {
  const { q = "", profileId = "", page: pageRaw } = await searchParams;
  const page = Math.max(1, Number(pageRaw) || 1);

  const { rows: customers, total } = await listCustomers({ q, page });
  const totalPages = Math.max(1, Math.ceil(total / CUSTOMER_PER_PAGE));

  const [selected, transaksi] = profileId
    ? await Promise.all([getProfileById(profileId), listTransaksiByCustomer(profileId)])
    : [null, []];

  // Bangun querystring tanpa nilai kosong.
  const qs = (o: Record<string, string | number | undefined>) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(o)) if (v !== undefined && v !== "" && v !== null) sp.set(k, String(v));
    const s = sp.toString();
    return s ? `?${s}` : "";
  };
  const linkCustomer = (id: string) => `/admin/master/customer${qs({ profileId: id, q, page })}`;
  const linkPage = (n: number) => `/admin/master/customer${qs({ q, profileId, page: n })}`;

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
              className={`rounded border bg-white p-3 text-sm hover:bg-slate-50 ${
                c.id === profileId ? "border-slate-800" : "border-slate-200"
              }`}
            >
              <span className="font-semibold text-slate-800">{c.nama ?? "(tanpa nama)"}</span>
              <span className="text-slate-500"> · {c.no_wa ?? "-"}</span>
              {c.email && <div className="text-xs text-slate-400">{c.email}</div>}
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

      {/* Detail customer terpilih: edit profil + riwayat transaksi */}
      {selected && (
        <>
          <form action={simpanProfilCustomer} className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="font-semibold text-slate-700">Edit Profil Customer</h2>
            <input type="hidden" name="id" value={selected.id} />
            <input type="hidden" name="q" value={q} />
            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="block text-sm">Nama<input name="nama" defaultValue={selected.nama ?? ""} className={inp} /></label>
              <label className="block text-sm">No. WhatsApp<input name="no_wa" defaultValue={selected.no_wa ?? ""} className={inp} /></label>
              <label className="block text-sm">Email<input name="email" type="email" defaultValue={selected.email ?? ""} className={inp} /></label>
              <label className="block text-sm">Alamat<input name="alamat" defaultValue={selected.alamat ?? ""} className={inp} /></label>
            </div>
            <button className="mt-3 h-10 rounded bg-slate-800 px-4 text-sm text-white">Simpan Profil</button>
          </form>

          <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="font-semibold text-slate-700">Riwayat Transaksi ({transaksi.length})</h2>
            {transaksi.length === 0 ? (
              <p className="mt-2 text-sm text-slate-400">Customer ini belum pernah bertransaksi.</p>
            ) : (
              <ul className="mt-3 divide-y divide-slate-100">
                {transaksi.map((t) => (
                  <li key={t.kode_booking}>
                    <Link
                      href={`/admin/transaksi/${t.kode_booking}`}
                      className="flex items-center justify-between gap-3 py-2.5 text-sm hover:bg-slate-50"
                    >
                      <span>
                        <span className="font-mono font-semibold text-slate-800">{t.kode_booking}</span>
                        <span className="text-slate-500"> · {t.tanggal}{t.sesi ? ` · ${t.sesi.nama}` : ""}</span>
                        <div className="text-xs text-slate-400">
                          {t.package?.layanan?.nama ?? "-"} · {t.package?.nama ?? "-"}
                        </div>
                      </span>
                      <span className="shrink-0 text-right">
                        <div className="font-semibold text-slate-700">{formatRupiah(t.payment?.total ?? 0)}</div>
                        <div className="text-xs text-slate-400">{LABEL_BAYAR[t.payment?.status_bayar ?? "unpaid"] ?? "-"}</div>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </main>
  );
}
