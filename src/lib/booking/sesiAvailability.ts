import { createAdminClient } from "@/lib/supabase/admin";
import { toMinutes } from "@/lib/time/time";

export type SesiOpsi = { id: string; nama: string; jam_mulai: string; urutan: number };

/**
 * Fungsi murni: saring sesi yang tersedia.
 * - isBlackout: tanggal tutup -> kosong.
 * - sesiTerpakaiIds: sesi yang sudah dikunci booking terbayar (dp_paid/lunas) utk LAYANAN+TANGGAL ini.
 * - isHariIni + nowMinutes: buang sesi yang jam mulainya sudah lewat hari ini.
 */
export function filterSesiTersedia(
  sesiAktif: SesiOpsi[],
  sesiTerpakaiIds: string[],
  isBlackout: boolean,
  isHariIni: boolean,
  nowMinutes: number,
): SesiOpsi[] {
  if (isBlackout) return [];
  const terpakai = new Set(sesiTerpakaiIds);
  return sesiAktif.filter((s) => {
    if (terpakai.has(s.id)) return false;
    if (isHariIni && toMinutes(s.jam_mulai) <= nowMinutes) return false;
    return true;
  });
}

/**
 * Ketersediaan sesi untuk sebuah paket pada sebuah tanggal ("YYYY-MM-DD").
 * Kapasitas 1 per (layanan, sesi, tanggal): sesi terkunci bila ADA booking lain
 * untuk paket SE-LAYANAN pada tanggal+sesi sama dengan status bayar dp_paid/lunas.
 */
export async function getSesiTersedia(packageId: string, tanggal: string): Promise<SesiOpsi[]> {
  const admin = createAdminClient();

  // 1. Paket -> layanan_id (+ aktif?)
  const { data: paket } = await admin
    .from("package")
    .select("layanan_id, is_active")
    .eq("id", packageId)
    .single();
  if (!paket || !paket.is_active) return [];
  const layananId = paket.layanan_id as string;

  // 2. Blackout?
  const { data: blackout } = await admin
    .from("blackout_date")
    .select("id")
    .eq("tanggal", tanggal)
    .maybeSingle();
  const isBlackout = !!blackout;

  // 3. Sesi aktif (urut)
  const { data: sesiRows } = await admin
    .from("sesi")
    .select("id, nama, jam_mulai, urutan")
    .eq("is_active", true)
    .order("urutan");
  const sesiAktif = (sesiRows as SesiOpsi[]) ?? [];

  // 4. Booking terbayar pada tanggal ini untuk layanan ini -> sesi_id terpakai
  const { data: booked } = await admin
    .from("booking")
    .select("sesi_id, package!inner(layanan_id), payment!inner(status_bayar)")
    .eq("tanggal", tanggal)
    .eq("package.layanan_id", layananId)
    .in("payment.status_bayar", ["dp_paid", "lunas"]);
  const sesiTerpakai = (booked ?? []).map((b) => b.sesi_id as string);

  // 5. Hari ini? buang sesi lampau
  const now = new Date();
  const isHariIni = tanggal === now.toISOString().slice(0, 10);
  const nowMinutes = isHariIni ? now.getHours() * 60 + now.getMinutes() : 0;

  return filterSesiTersedia(sesiAktif, sesiTerpakai, isBlackout, isHariIni, nowMinutes);
}
