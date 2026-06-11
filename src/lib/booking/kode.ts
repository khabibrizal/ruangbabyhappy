/** Bentuk kode booking deterministik: RBH-20260721-AB12. Suffix di-uppercase. */
export function buildKodeBooking(tanggal: string, suffix: string): string {
  return `RBH-${tanggal.replaceAll("-", "")}-${suffix.toUpperCase()}`;
}

/** Suffix acak 4 karakter (dipakai server; tidak murni sehingga tak di-unit-test). */
export function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 6);
}
