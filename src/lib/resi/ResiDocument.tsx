import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { ResiRow } from "@/lib/booking/queries";

const INK = "#1f2937";
const MUTE = "#6b7280";

const s = StyleSheet.create({
  page: { paddingVertical: 36, paddingHorizontal: 48, fontSize: 13, color: INK },
  block: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#d1d5db",
    borderBottomStyle: "dashed",
  },
  row: { flexDirection: "row", marginBottom: 4 },
  label: { width: 80, fontWeight: 700 },
  sep: { width: 10 },
  val: { flex: 1 },
  alamat: { marginTop: 2, marginLeft: 90 },
  foot: { position: "absolute", bottom: 18, left: 48, right: 48, fontSize: 8, color: MUTE, textAlign: "center" },
});

/** Pecah daftar penerima jadi grup berisi maksimal 5 (1 halaman A4). Fungsi murni. */
export function chunk5<T>(items: T[]): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += 5) out.push(items.slice(i, i + 5));
  return out;
}

function Blok({ r }: { r: ResiRow }) {
  return (
    <View style={s.block} wrap={false}>
      <View style={s.row}>
        <Text style={s.label}>Pengirim</Text>
        <Text style={s.sep}>:</Text>
        <Text style={s.val}>{r.pengirimNama} ({r.pengirimWa})</Text>
      </View>
      <View style={s.row}>
        <Text style={s.label}>Penerima</Text>
        <Text style={s.sep}>:</Text>
        <Text style={s.val}>{r.penerimaNama} ({r.penerimaWa})</Text>
      </View>
      <Text style={s.alamat}>{r.penerimaAlamat}</Text>
    </View>
  );
}

export function ResiDocument({ rows }: { rows: ResiRow[] }) {
  const halaman = chunk5(rows);
  return (
    <Document title="Resi Pengiriman — Ruang Baby Happy">
      {halaman.map((grup, i) => (
        <Page key={i} size="A4" style={s.page}>
          {grup.map((r) => (
            <Blok key={r.kode} r={r} />
          ))}
          <Text style={s.foot} render={({ pageNumber, totalPages }) => `Resi Pengiriman · Ruang Baby Happy · Halaman ${pageNumber}/${totalPages}`} fixed />
        </Page>
      ))}
    </Document>
  );
}
