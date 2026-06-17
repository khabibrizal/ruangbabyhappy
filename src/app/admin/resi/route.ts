import { renderToBuffer } from "@react-pdf/renderer";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { listResiByKodes } from "@/lib/booking/queries";
import { ResiDocument } from "@/lib/resi/ResiDocument";

export async function GET(req: Request) {
  const me = await getCurrentProfile();
  if (me?.role !== "admin") return new Response("Forbidden", { status: 403 });

  const { searchParams } = new URL(req.url);
  const kodes = (searchParams.get("kode") ?? "").split(",").map((k) => k.trim()).filter(Boolean);
  const rows = await listResiByKodes(kodes);
  if (rows.length === 0) {
    return new Response("Tidak ada transaksi eligible (status Pengiriman/Selesai) untuk dicetak.", { status: 400 });
  }

  const buffer = await renderToBuffer(ResiDocument({ rows }));
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="resi-pengiriman.pdf"`,
    },
  });
}
