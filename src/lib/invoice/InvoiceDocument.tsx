import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { formatRupiah } from "@/lib/format/rupiah";

export type InvoiceData = {
  kode: string; nama: string; noWa: string;
  anak: string; lokasi: string;
  layanan: string; paket: string; tanggal: string; sesi: string;
  total: number; ongkos: number; diskon: number; tagihan: number; dp: number; sisa: number;
  status: string; tglCetak: string;
  bank: string; noRek: string; atasNama: string;
  brandNama: string; brandTagline: string; brandIg: string; brandAlamat: string;
  items?: { nama: string; qty: number; harga: number }[];
};

const PINK = "#ec4899";
const PINK_SOFT = "#fdf2f8";
const BORDER = "#f0d9e6";
const INK = "#4a3b47";
const MUTE = "#8b8b8b";

function badgeColor(label: string): { bg: string; fg: string } {
  if (label === "Lunas") return { bg: "#dcfce7", fg: "#15803d" };
  if (label.includes("DP")) return { bg: "#fef3c7", fg: "#b45309" };
  return { bg: "#fee2e2", fg: "#b91c1c" };
}

const s = StyleSheet.create({
  page: { paddingBottom: 40, fontSize: 10, color: INK },
  band: {
    backgroundColor: PINK, paddingVertical: 24, paddingHorizontal: 36,
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
  },
  brandName: { fontSize: 20, fontWeight: 700, color: "#ffffff" },
  tagline: { fontSize: 9, color: "#ffe4f0", marginTop: 3 },
  invLabel: { fontSize: 16, fontWeight: 700, color: "#ffffff", textAlign: "right" },
  invMeta: { fontSize: 9, color: "#ffe4f0", textAlign: "right", marginTop: 3 },
  body: { paddingHorizontal: 36, paddingTop: 20 },
  cards: { flexDirection: "row" },
  card: { flex: 1, borderWidth: 1, borderColor: BORDER, borderRadius: 10, padding: 12 },
  cardH: { fontSize: 8, color: MUTE, letterSpacing: 1, marginBottom: 5 },
  line: { marginBottom: 3 },
  sectionH: { fontSize: 11, fontWeight: 700, marginTop: 20, marginBottom: 4 },
  itemRow: {
    flexDirection: "row", justifyContent: "space-between",
    borderBottomWidth: 1, borderBottomColor: "#f3f3f3", paddingVertical: 7,
  },
  itemName: { fontWeight: 700 },
  itemSub: { fontSize: 8, color: MUTE, marginTop: 2 },
  summary: { backgroundColor: PINK_SOFT, borderRadius: 10, padding: 14, marginTop: 14 },
  sumRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  sumTotalRow: {
    flexDirection: "row", justifyContent: "space-between",
    borderTopWidth: 1, borderTopColor: BORDER, marginTop: 6, paddingTop: 6,
  },
  totalTxt: { fontSize: 13, fontWeight: 700, color: PINK },
  rekBox: { borderWidth: 1, borderColor: BORDER, borderRadius: 10, padding: 12, marginTop: 16 },
  foot: { marginTop: 24, textAlign: "center", color: MUTE, fontSize: 9 },
});

export function InvoiceDocument({ d }: { d: InvoiceData }) {
  const b = badgeColor(d.status);
  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header band */}
        <View style={s.band}>
          <View>
            <Text style={s.brandName}>{d.brandNama}</Text>
            <Text style={s.tagline}>{d.brandTagline}</Text>
          </View>
          <View>
            <Text style={s.invLabel}>INVOICE</Text>
            <Text style={s.invMeta}>{d.kode}</Text>
            <Text style={s.invMeta}>{d.tglCetak}</Text>
          </View>
        </View>

        <View style={s.body}>
          {/* Kartu Kepada + Status */}
          <View style={s.cards}>
            <View style={[s.card, { marginRight: 12 }]}>
              <Text style={s.cardH}>KEPADA</Text>
              <Text style={[s.line, { fontWeight: 700 }]}>{d.nama}</Text>
              <Text style={s.line}>{d.noWa}</Text>
              <Text style={s.line}>Anak: {d.anak}</Text>
              <Text style={s.line}>Lokasi: {d.lokasi}</Text>
            </View>
            <View style={s.card}>
              <Text style={s.cardH}>JADWAL & STATUS</Text>
              <Text style={s.line}>Layanan: {d.layanan}</Text>
              <Text style={s.line}>{d.tanggal} · {d.sesi}</Text>
              <View style={{ flexDirection: "row", marginTop: 4 }}>
                <Text style={{ backgroundColor: b.bg, color: b.fg, fontSize: 9, fontWeight: 700, paddingVertical: 3, paddingHorizontal: 10, borderRadius: 999 }}>
                  {d.status}
                </Text>
              </View>
            </View>
          </View>

          {/* Rincian pesanan */}
          <Text style={s.sectionH}>Rincian Pesanan</Text>
          {d.items && d.items.length > 0 ? (
            d.items.map((it, i) => (
              <View key={i} style={s.itemRow}>
                <View><Text style={s.itemName}>{it.nama}</Text><Text style={s.itemSub}>{it.qty} × {formatRupiah(it.harga)}</Text></View>
                <Text>{formatRupiah(it.harga * it.qty)}</Text>
              </View>
            ))
          ) : (
            <View style={s.itemRow}>
              <View><Text style={s.itemName}>{d.paket}</Text><Text style={s.itemSub}>{d.layanan} · {d.tanggal} · {d.sesi}</Text></View>
              <Text>{formatRupiah(d.total)}</Text>
            </View>
          )}
          {d.ongkos > 0 && (
            <View style={s.itemRow}>
              <View>
                <Text style={s.itemName}>Home Service</Text>
                <Text style={s.itemSub}>{d.lokasi}</Text>
              </View>
              <Text>{formatRupiah(d.ongkos)}</Text>
            </View>
          )}

          {/* Ringkasan */}
          <View style={s.summary}>
            <View style={s.sumRow}><Text>Subtotal</Text><Text>{formatRupiah(d.total + d.ongkos)}</Text></View>
            {d.diskon > 0 && (
              <View style={s.sumRow}><Text>Diskon pelanggan lama</Text><Text>-{formatRupiah(d.diskon)}</Text></View>
            )}
            <View style={s.sumTotalRow}><Text style={s.totalTxt}>TOTAL</Text><Text style={s.totalTxt}>{formatRupiah(d.tagihan)}</Text></View>
            <View style={s.sumRow}><Text>DP</Text><Text>{formatRupiah(d.dp)}</Text></View>
            <View style={s.sumRow}><Text>Sisa</Text><Text>{formatRupiah(d.sisa)}</Text></View>
          </View>

          {/* Rekening */}
          <View style={s.rekBox}>
            <Text style={s.cardH}>PEMBAYARAN KE</Text>
            <Text style={s.line}>{d.bank} · {d.noRek}</Text>
            <Text style={s.line}>a.n. {d.atasNama}</Text>
          </View>

          <Text style={s.foot}>
            Terima kasih telah mempercayakan momen si kecil pada {d.brandNama}{"\n"}
            @{d.brandIg} · {d.brandAlamat}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
