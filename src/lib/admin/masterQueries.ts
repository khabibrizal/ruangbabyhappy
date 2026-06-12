import { createAdminClient } from "@/lib/supabase/admin";

export type LayananRow = { id: string; nama: string; admin_wa: string; bank: string | null; no_rek: string | null; atas_nama: string | null; urutan: number; is_active: boolean };
export type PaketRow = {
  id: string; layanan_id: string; nama: string; deskripsi: string | null;
  harga: number; diskon_returning: number; dp_persen: number; durasi_menit: number; is_active: boolean;
};
export type SesiRow = { id: string; nama: string; jam_mulai: string; urutan: number; is_active: boolean };
export type ZonaRow = { id: string; nama: string; keterangan: string | null; biaya: number; urutan: number; is_active: boolean };
export type BlackoutRow = { id: string; tanggal: string; keterangan: string | null };

export async function listLayanan(): Promise<LayananRow[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("layanan")
    .select("id, nama, admin_wa, bank, no_rek, atas_nama, urutan, is_active")
    .order("urutan");
  return (data as LayananRow[]) ?? [];
}

export async function listPaket(): Promise<PaketRow[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("package")
    .select("id, layanan_id, nama, deskripsi, harga, diskon_returning, dp_persen, durasi_menit, is_active")
    .order("harga");
  return (data as PaketRow[]) ?? [];
}

export async function listSesi(): Promise<SesiRow[]> {
  const admin = createAdminClient();
  const { data } = await admin.from("sesi").select("id, nama, jam_mulai, urutan, is_active").order("urutan");
  return (data as SesiRow[]) ?? [];
}

export async function listZona(): Promise<ZonaRow[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("zona_ongkos")
    .select("id, nama, keterangan, biaya, urutan, is_active")
    .order("urutan");
  return (data as ZonaRow[]) ?? [];
}

export async function listBlackout(): Promise<BlackoutRow[]> {
  const admin = createAdminClient();
  const { data } = await admin.from("blackout_date").select("id, tanggal, keterangan").order("tanggal");
  return (data as BlackoutRow[]) ?? [];
}
