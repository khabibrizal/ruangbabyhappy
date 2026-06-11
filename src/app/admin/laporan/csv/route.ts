import { getLaporan } from "@/lib/report/queries";
import { toCSV } from "@/lib/report/csv";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rows = await getLaporan({
    dari: searchParams.get("dari") ?? undefined,
    sampai: searchParams.get("sampai") ?? undefined,
    status: searchParams.get("status") ?? undefined,
  });
  const csv = toCSV(
    ["Kode", "Tanggal", "Layanan", "Paket", "Member", "Status Bayar", "Total"],
    rows.map((r) => {
      const tagihan = (r.payment?.total ?? 0) + (r.payment?.ongkos ?? 0) - (r.payment?.diskon ?? 0);
      return [
        r.kode_booking, r.tanggal,
        r.package?.layanan?.nama ?? "-", r.package?.nama ?? "-",
        r.profile?.nama ?? "Member",
        r.payment?.status_bayar ?? "unpaid", String(tagihan),
      ];
    }),
  );
  return new Response(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="laporan.csv"' },
  });
}
