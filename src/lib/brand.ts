export const brand = {
  nama: "Ruang Baby Happy",
  wordmark: "Ruang Baby Happy",
  tagline: "imagine your little moment",
  ig: "ruangbabyhappy",
  igUrl: "https://instagram.com/ruangbabyhappy",
  // TODO(user): ganti alamat & koordinat asli saat implementasi
  alamat: "Sidoarjo",
  kota: "Sidoarjo",
  mapsEmbed: "https://maps.google.com/maps?q=-7.4478,112.7183&z=15&output=embed",
  mapsDir: "https://www.google.com/maps/dir/?api=1&destination=-7.4478,112.7183",
  // TODO(user): isi rekening asli untuk ditampilkan di invoice
  bank: "BCA",
  noRek: "0000000000",
  atasNama: "Ruang Baby Happy",
} as const;

// Foto galeri diisi via master Galeri (Plan 4/5) / folder public; kosong di awal.
export const galleryImages: string[] = [];
