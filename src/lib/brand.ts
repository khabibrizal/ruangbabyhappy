export const brand = {
  nama: "Ruang Baby Happy",
  wordmark: "Ruang Baby Happy",
  tagline: "imagine your little moment",
  ig: "ruangbabyhappy",
  igUrl: "https://instagram.com/ruangbabyhappy",
  // TODO(user): ganti alamat & koordinat asli saat implementasi
  alamat: "Sidoarjo",
  kota: "Sidoarjo",
  // Titik lokasi studio (dari https://maps.app.goo.gl/L9idTE82A7igrQW97)
  mapsEmbed: "https://maps.google.com/maps?q=-7.368132,112.759980&z=16&output=embed",
  // Rute TANPA origin -> Google otomatis pakai lokasi user (petunjuk arah dari lokasimu)
  mapsDir: "https://www.google.com/maps/dir/?api=1&destination=-7.368132,112.759980",
  // TODO(user): isi rekening asli untuk ditampilkan di invoice
  bank: "BCA",
  noRek: "0000000000",
  atasNama: "Ruang Baby Happy",
} as const;

// Foto galeri diisi via master Galeri (Plan 4/5) / folder public; kosong di awal.
export const galleryImages: string[] = [];
