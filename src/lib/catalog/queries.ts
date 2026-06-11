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

/** Untuk landing: layanan aktif beserta paket aktifnya (urut). Layanan tanpa paket aktif dibuang. */
export async function getLayananDenganPaket(): Promise<LayananDenganPaket[]> {
  const supabase = await createClient();
  const { data: layanan } = await supabase
    .from("layanan")
    .select("id, nama, urutan")
    .eq("is_active", true)
    .order("urutan");
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
  foto_url: string | null;
  layanan_id: string;
  layanan_nama: string;
  layanan_admin_wa: string;
};

/** Untuk halaman detail/booking (Plan 3): paket + layanan-nya. */
export async function getPackageById(id: string): Promise<PackageDetail | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("package")
    .select(
      "id, nama, deskripsi, harga, dp_persen, diskon_returning, durasi_menit, foto_url, layanan_id, layanan(nama, admin_wa)",
    )
    .eq("id", id)
    .eq("is_active", true)
    .maybeSingle();
  if (!data) return null;
  const layanan = data.layanan as unknown as { nama: string; admin_wa: string } | null;
  return {
    id: data.id as string,
    nama: data.nama as string,
    deskripsi: (data.deskripsi as string) ?? null,
    harga: data.harga as number,
    dp_persen: data.dp_persen as number,
    diskon_returning: data.diskon_returning as number,
    durasi_menit: data.durasi_menit as number,
    foto_url: (data.foto_url as string) ?? null,
    layanan_id: data.layanan_id as string,
    layanan_nama: layanan?.nama ?? "",
    layanan_admin_wa: layanan?.admin_wa ?? "",
  };
}
