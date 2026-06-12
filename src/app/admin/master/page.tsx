import Link from "next/link";

const MENU = [
  { href: "/admin/master/vendor", label: "Vendor" },
  { href: "/admin/master/layanan", label: "Layanan" },
  { href: "/admin/master/paket", label: "Paket" },
  { href: "/admin/master/sesi", label: "Sesi" },
  { href: "/admin/master/zona", label: "Zona Ongkos" },
  { href: "/admin/master/blackout", label: "Blackout Date" },
  { href: "/admin/master/galeri", label: "Galeri" },
];

export default function MasterHubPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Master Data</h1>
        <Link href="/admin" className="text-sm text-slate-500 underline">← Dashboard</Link>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {MENU.map((m) => (
          <Link key={m.href} href={m.href}
            className="flex h-20 items-center justify-center rounded-lg border border-slate-200 bg-white text-center font-medium hover:bg-slate-50">
            {m.label}
          </Link>
        ))}
      </div>
    </main>
  );
}
