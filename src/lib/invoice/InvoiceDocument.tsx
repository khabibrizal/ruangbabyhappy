import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { formatRupiah } from "@/lib/format/rupiah";

export type InvoiceData = {
  kode: string; nama: string; noWa: string;
  anak: string; lokasi: string;
  layanan: string; paket: string; tanggal: string; sesi: string;
  total: number; ongkos: number; diskon: number; tagihan: number; dp: number; sisa: number;
  status: string; tglCetak: string;
};

const s = StyleSheet.create({
  page: { padding: 36, fontSize: 11, color: "#111" },
  brand: { fontSize: 18, fontWeight: 700 },
  tagline: { color: "#888", marginBottom: 16 },
  h: { fontSize: 13, fontWeight: 700, marginTop: 14, marginBottom: 6 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  label: { color: "#666" },
  total: { fontSize: 14, fontWeight: 700 },
  foot: { marginTop: 24, color: "#888" },
});

export function InvoiceDocument({ d }: { d: InvoiceData }) {
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Text style={s.brand}>Ruang Baby Happy</Text>
        <Text style={s.tagline}>imagine your little moment</Text>

        <View style={s.row}><Text style={s.label}>No. Transaksi</Text><Text>{d.kode}</Text></View>
        <View style={s.row}><Text style={s.label}>Tanggal cetak</Text><Text>{d.tglCetak}</Text></View>

        <Text style={s.h}>Customer</Text>
        <View style={s.row}><Text style={s.label}>Nama</Text><Text>{d.nama}</Text></View>
        <View style={s.row}><Text style={s.label}>No WA</Text><Text>{d.noWa}</Text></View>
        <View style={s.row}><Text style={s.label}>Anak</Text><Text>{d.anak}</Text></View>
        <View style={s.row}><Text style={s.label}>Lokasi</Text><Text>{d.lokasi}</Text></View>

        <Text style={s.h}>Pesanan</Text>
        <View style={s.row}><Text style={s.label}>Layanan</Text><Text>{d.layanan}</Text></View>
        <View style={s.row}><Text style={s.label}>Paket</Text><Text>{d.paket}</Text></View>
        <View style={s.row}><Text style={s.label}>Jadwal</Text><Text>{d.tanggal} · {d.sesi}</Text></View>

        <Text style={s.h}>Pembayaran</Text>
        <View style={s.row}><Text style={s.label}>Paket</Text><Text>{formatRupiah(d.total)}</Text></View>
        <View style={s.row}><Text style={s.label}>Home Service</Text><Text>{formatRupiah(d.ongkos)}</Text></View>
        <View style={s.row}><Text style={s.label}>Diskon</Text><Text>-{formatRupiah(d.diskon)}</Text></View>
        <View style={s.row}><Text style={s.label}>Total</Text><Text style={s.total}>{formatRupiah(d.tagihan)}</Text></View>
        <View style={s.row}><Text style={s.label}>DP</Text><Text>{formatRupiah(d.dp)}</Text></View>
        <View style={s.row}><Text style={s.label}>Sisa</Text><Text>{formatRupiah(d.sisa)}</Text></View>
        <View style={s.row}><Text style={s.label}>Status</Text><Text>{d.status}</Text></View>

        <Text style={s.foot}>Terima kasih telah mempercayakan momen si kecil pada Ruang Baby Happy 🎀</Text>
      </Page>
    </Document>
  );
}
