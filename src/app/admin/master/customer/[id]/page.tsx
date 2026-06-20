import Link from "next/link";
import { notFound } from "next/navigation";
import { simpanProfilCustomer, resetPasswordCustomer } from "@/lib/admin/customerSearch";
import { getProfileById, listTransaksiByCustomer } from "@/lib/booking/queries";
import { formatRupiah } from "@/lib/format/rupiah";
import SubmitButton from "@/components/ui/SubmitButton";

export const dynamic = "force-dynamic";
const inp = "mt-1 block w-full rounded border border-slate-300 p-2 text-sm";
const LABEL_BAYAR: Record<string, string> = { unpaid: "Belum bayar", dp_paid: "Sudah DP", lunas: "Lunas" };

export default async function DetailCustomerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { id } = await params;
  const { q = "", page = "" } = await searchParams;

  const [selected, transaksi] = await Promise.all([getProfileById(id), listTransaksiByCustomer(id)]);
  if (!selected) notFound();

  // Link balik ke daftar dgn konteks pencarian/halaman dipertahankan.
  const sp = new URLSearchParams();
  if (q) sp.set("q", q);
  if (page) sp.set("page", page);
  const backHref = `/admin/master/customer${sp.toString() ? `?${sp}` : ""}`;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Detail Customer</h1>
        <Link href={backHref} className="text-sm text-slate-500 underline">← Daftar Customer</Link>
      </div>

      <form action={simpanProfilCustomer} className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="font-semibold text-slate-700">Edit Profil Customer</h2>
        <input type="hidden" name="id" value={selected.id} />
        <input type="hidden" name="q" value={q} />
        <input type="hidden" name="page" value={page} />
        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="block text-sm">Nama<input name="nama" defaultValue={selected.nama ?? ""} className={inp} /></label>
          <label className="block text-sm">No. WhatsApp<input name="no_wa" defaultValue={selected.no_wa ?? ""} className={inp} /></label>
          <label className="block text-sm">Email<input name="email" type="email" defaultValue={selected.email ?? ""} className={inp} /></label>
          <label className="block text-sm">Instagram<input name="ig" defaultValue={selected.ig ?? ""} className={inp} /></label>
          <label className="block text-sm">Alamat<input name="alamat" defaultValue={selected.alamat ?? ""} className={inp} /></label>
        </div>
        <SubmitButton className="mt-3 h-10 rounded bg-slate-800 px-4 text-sm text-white">Simpan Profil</SubmitButton>
      </form>

      {/* Reset password (cadangan bila customer lupa & email bermasalah) */}
      <form action={resetPasswordCustomer} className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="font-semibold text-slate-700">Reset Password</h2>
        <p className="mt-1 text-xs text-slate-400">Set password baru utk customer ini (hanya untuk yang sudah punya akun login).</p>
        <input type="hidden" name="id" value={selected.id} />
        <input type="hidden" name="q" value={q} />
        <input type="hidden" name="page" value={page} />
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <label className="flex-1 text-sm">Password baru
            <input name="password" type="text" minLength={8} placeholder="Minimal 8 karakter" className={inp} required />
          </label>
          <SubmitButton className="h-10 rounded bg-slate-800 px-4 text-sm text-white">Reset Password</SubmitButton>
        </div>
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
    </main>
  );
}
