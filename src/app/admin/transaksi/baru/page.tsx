import Link from "next/link";
import { listPaket, listLayanan, listSesi } from "@/lib/admin/masterQueries";
import { getZonaAktif } from "@/lib/catalog/queries";
import FormTransaksiBaru from "./FormTransaksiBaru";

export const dynamic = "force-dynamic";

export default async function TransaksiBaruPage() {
  const [paket, layanan, sesi, zona] = await Promise.all([listPaket(), listLayanan(), listSesi(), getZonaAktif()]);
  const layananNama = new Map(layanan.map((l) => [l.id, l.nama]));
  const paketAktif = paket.filter((p) => p.is_active).map((p) => ({
    id: p.id, nama: p.nama, harga: p.harga, dp_persen: p.dp_persen, layanan: layananNama.get(p.layanan_id) ?? "",
  }));
  const sesiAktif = sesi.filter((s) => s.is_active).map((s) => ({ id: s.id, nama: s.nama, jam_mulai: s.jam_mulai }));

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Transaksi Baru</h1>
        <Link href="/admin/transaksi" className="text-sm text-slate-500 underline">← Transaksi</Link>
      </div>
      <FormTransaksiBaru paket={paketAktif} sesi={sesiAktif} zona={zona} />
    </main>
  );
}
