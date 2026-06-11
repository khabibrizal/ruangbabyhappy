export const TAHAP_PENGERJAAN = ["pilih_foto", "edit", "cetak", "pengiriman", "selesai"] as const;
export type TahapPengerjaan = (typeof TAHAP_PENGERJAAN)[number];

export const LABEL_PENGERJAAN: Record<TahapPengerjaan, string> = {
  pilih_foto: "Pilih Foto",
  edit: "Edit",
  cetak: "Cetak",
  pengiriman: "Pengiriman",
  selesai: "Selesai",
};

/** Posisi tahap (0..4). null/tak dikenal -> -1 (belum mulai). */
export function indexTahap(status: string | null): number {
  if (!status) return -1;
  const i = (TAHAP_PENGERJAAN as readonly string[]).indexOf(status);
  return i;
}
