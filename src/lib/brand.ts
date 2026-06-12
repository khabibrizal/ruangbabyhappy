export const brand = {
  nama: "Ruang Baby Happy",
  wordmark: "Ruang Baby Happy",
  tagline: "imagine your little moment",
  ig: "ruangbabyhappy",
  igUrl: "https://instagram.com/ruangbabyhappy",
  alamat: "Jl. Abdulrahman no 33 rt 13 rw 05 Payan Pabean Sedati Sidoarjo",
  kota: "Sidoarjo",
  // Link publik Google Maps/GBP studio (untuk JSON-LD hasMap & tombol arah)
  maps: "https://maps.app.goo.gl/L9idTE82A7igrQW97",
  mapsEmbed: "https://maps.google.com/maps?q=-7.368132,112.759980&z=16&output=embed",
  // Rute TANPA origin -> Google otomatis pakai lokasi user (petunjuk arah dari lokasimu)
  mapsDir: "https://www.google.com/maps/dir/?api=1&destination=-7.368132,112.759980",
  // TODO(user): isi rekening asli untuk ditampilkan di invoice
  bank: "BCA",
  noRek: "0000000000",
  atasNama: "Ruang Baby Happy",
  // --- Data untuk JSON-LD / SEO lokal ---
  alamatLengkap: "Jl. Abdulrahman no 33 rt 13 rw 05 Payan Pabean Sedati Sidoarjo, Jawa Timur", // schema PostalAddress
  telepon: "+6282233684933", // schema telephone (E.164)
  geo: { lat: -7.368132, lng: 112.75998 }, // dari mapsEmbed
} as const;

// Foto galeri diisi via master Galeri (Plan 4/5) / folder public; kosong di awal.
export const galleryImages: string[] = [];
