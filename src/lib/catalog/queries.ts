import { createClient } from "@/lib/supabase/server";

export type PaketCard = {
  id: string;
  nama: string;
  deskripsi: string | null;
  harga: number;
  dp_persen: number;
  diskon_returning: number;
  durasi_menit: number;
  foto_url: string | null;
};

export type LayananDenganPaket = {
  id: string;
  nama: string;
  urutan: number;
  paket: PaketCard[];
};

const PAKET_COLS =
  "id, nama, deskripsi, harga, dp_persen, diskon_returning, durasi_menit, foto_url, is_active, layanan_id";

/** Untuk landing: layanan aktif (vendor default saja) beserta paket aktifnya (urut). Layanan tanpa paket aktif dibuang. */
export async function getLayananDenganPaket(): Promise<LayananDenganPaket[]> {
  const supabase = await createClient();

  const { data: def } = await supabase
    .from("vendor")
    .select("id")
    .eq("is_default", true)
    .maybeSingle();
  const defaultVendorId = (def as { id: string } | null)?.id ?? null;

  let q = supabase
    .from("layanan")
    .select("id, nama, urutan")
    .eq("is_active", true);
  if (defaultVendorId) q = q.eq("vendor_id", defaultVendorId);
  const { data: layanan } = await q.order("urutan");
  if (!layanan) return [];

  const { data: paket } = await supabase
    .from("package")
    .select(PAKET_COLS)
    .eq("is_active", true)
    .order("harga");
  const semua = (paket as (PaketCard & { is_active: boolean; layanan_id: string })[]) ?? [];

  return (layanan as { id: string; nama: string; urutan: number }[])
    .map((l) => ({
      ...l,
      paket: semua.filter((p) => p.layanan_id === l.id),
    }))
    .filter((l) => l.paket.length > 0);
}

export type PackageDetail = {
  id: string;
  nama: string;
  deskripsi: string | null;
  harga: number;
  dp_persen: number;
  diskon_returning: number;
  durasi_menit: number;
  bisa_studio: boolean;
  bisa_home: boolean;
  foto_url: string | null;
  layanan_id: string;
  layanan_nama: string;
  layanan_admin_wa: string;
  layanan_bank: string | null;
  layanan_no_rek: string | null;
  layanan_atas_nama: string | null;
  butuh_anak: boolean;
  vendor_nama: string;
  vendor_tagline: string | null;
  vendor_ig: string | null;
  vendor_alamat: string | null;
  vendor_slug: string;
  vendor_is_default: boolean;
};

/** Untuk halaman detail/booking (Plan 3): paket + layanan-nya + vendor brand. */
export async function getPackageById(id: string): Promise<PackageDetail | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("package")
    .select(
      "id, nama, deskripsi, harga, dp_persen, diskon_returning, durasi_menit, bisa_studio, bisa_home, foto_url, layanan_id, layanan:layanan_id(nama, admin_wa, bank, no_rek, atas_nama, vendor:vendor_id(nama, tagline, ig, alamat, slug, butuh_anak, is_default))",
    )
    .eq("id", id)
    .eq("is_active", true)
    .maybeSingle();
  if (!data) return null;
  const layanan = data.layanan as unknown as {
    nama: string; admin_wa: string; bank: string | null; no_rek: string | null; atas_nama: string | null;
    vendor: { nama: string; tagline: string | null; ig: string | null; alamat: string | null; slug: string; butuh_anak: boolean; is_default: boolean } | null;
  } | null;
  const vendor = layanan?.vendor ?? null;
  return {
    id: data.id as string,
    nama: data.nama as string,
    deskripsi: (data.deskripsi as string) ?? null,
    harga: data.harga as number,
    dp_persen: data.dp_persen as number,
    diskon_returning: data.diskon_returning as number,
    durasi_menit: data.durasi_menit as number,
    bisa_studio: (data.bisa_studio as boolean) ?? true,
    bisa_home: (data.bisa_home as boolean) ?? true,
    foto_url: (data.foto_url as string) ?? null,
    layanan_id: data.layanan_id as string,
    layanan_nama: layanan?.nama ?? "",
    layanan_admin_wa: layanan?.admin_wa ?? "",
    layanan_bank: layanan?.bank ?? null,
    layanan_no_rek: layanan?.no_rek ?? null,
    layanan_atas_nama: layanan?.atas_nama ?? null,
    butuh_anak: vendor?.butuh_anak ?? true,
    vendor_nama: vendor?.nama ?? layanan?.nama ?? "",
    vendor_tagline: vendor?.tagline ?? null,
    vendor_ig: vendor?.ig ?? null,
    vendor_alamat: vendor?.alamat ?? null,
    vendor_slug: vendor?.slug ?? "",
    vendor_is_default: vendor?.is_default ?? true,
  };
}

export type ZonaOpsi = { id: string; nama: string; keterangan: string | null; biaya: number };

/** Zona ongkos aktif (urut) untuk pilihan home service di form booking. */
export async function getZonaAktif(): Promise<ZonaOpsi[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("zona_ongkos")
    .select("id, nama, keterangan, biaya")
    .eq("is_active", true)
    .order("urutan");
  return (data as ZonaOpsi[]) ?? [];
}
