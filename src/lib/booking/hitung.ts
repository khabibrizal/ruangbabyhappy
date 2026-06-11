/** Diskon pelanggan lama: member returning -> nilai diskon paket; selain itu 0. */
export function hitungDiskon(opts: { returning: boolean; diskonReturning: number }): number {
  return opts.returning ? opts.diskonReturning : 0;
}

/** Tagihan (grand total) = harga paket + ongkos home service − diskon. */
export function hitungTagihan(opts: { harga: number; ongkos: number; diskon: number }): number {
  return opts.harga + opts.ongkos - opts.diskon;
}

/** DP = persen × tagihan, dibulatkan ke rupiah terdekat. */
export function hitungDp(tagihan: number, dpPersen: number): number {
  return Math.round((tagihan * dpPersen) / 100);
}
