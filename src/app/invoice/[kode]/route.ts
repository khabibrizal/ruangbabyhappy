import { renderToBuffer } from "@react-pdf/renderer";
import { getDetailTransaksi } from "@/lib/booking/queries";
import { getBookingItems } from "@/lib/booking/queries";
import { InvoiceDocument } from "@/lib/invoice/InvoiceDocument";
import { brand } from "@/lib/brand";

const LABEL: Record<string, string> = { unpaid: "Belum bayar", dp_paid: "Sudah DP", lunas: "Lunas" };

export async function GET(_req: Request, { params }: { params: Promise<{ kode: string }> }) {
  const { kode } = await params;
  const d = await getDetailTransaksi(kode);
  if (!d) return new Response("Not found", { status: 404 });
  const items = await getBookingItems(d.id);

  const pay = d.payment;
  const status = pay?.status_bayar ?? "unpaid";
  const total = pay?.total ?? 0;
  const ongkos = pay?.ongkos ?? 0;
  const diskon = pay?.diskon ?? 0;
  const tagihan = total + ongkos - diskon;
  const dp = pay?.dp_amount ?? 0;

  const lay = d.package?.layanan;
  const bank = lay?.bank || brand.bank;
  const noRek = lay?.no_rek || brand.noRek;
  const atasNama = lay?.atas_nama || brand.atasNama;

  // Brand invoice = brand vendor (fallback ke brand global). Rekening tetap dari layanan.
  const brandNama = d.vendor_nama || brand.nama;
  const brandTagline = d.vendor_tagline || brand.tagline;
  const brandIg = d.vendor_ig || brand.ig;
  const brandAlamat = d.vendor_alamat || brand.alamat;

  const buffer = await renderToBuffer(
    InvoiceDocument({
      d: {
        kode: d.kode_booking,
        nama: d.profile?.nama ?? "Customer",
        noWa: d.profile?.no_wa ?? "-",
        anak: `${d.anak_nama} · ${d.anak_bb}kg · ${d.anak_jk}`,
        lokasi: d.lokasi_sesi === "home" ? `Home${d.zona ? ` (${d.zona.nama})` : ""}` : "Di Studio",
        layanan: d.package?.layanan?.nama ?? "-",
        paket: d.package?.nama ?? "-",
        tanggal: d.tanggal,
        sesi: d.sesi?.nama ?? "",
        total, ongkos, diskon, tagihan, dp,
        bank, noRek, atasNama,
        brandNama, brandTagline, brandIg, brandAlamat,
        items: items.map((it) => ({ nama: it.nama, qty: it.qty, harga: it.harga })),
        sisa: status === "lunas" ? 0 : Math.max(0, tagihan - dp),
        status: LABEL[status] ?? status,
        tglCetak: new Date().toISOString().slice(0, 10),
      },
    }),
  );

  return new Response(new Uint8Array(buffer), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="invoice-${kode}.pdf"` },
  });
}
