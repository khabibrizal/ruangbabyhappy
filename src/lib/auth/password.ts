export const MIN_PASSWORD = 8;

/**
 * Validasi password baru + konfirmasi. Fungsi murni.
 * Kembalikan pesan error (string) bila tidak valid, atau null bila valid.
 */
export function validasiPassword(baru: string, konfirmasi: string): string | null {
  if (!baru || baru.length < MIN_PASSWORD) return `Password minimal ${MIN_PASSWORD} karakter`;
  if (baru !== konfirmasi) return "Konfirmasi password tidak cocok";
  return null;
}
