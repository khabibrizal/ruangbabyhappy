import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import PublicShell from "@/components/public/PublicShell";
import { getPackageById, getZonaAktif } from "@/lib/catalog/queries";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAnakByProfile } from "@/lib/member/anak";
import { formatRupiah } from "@/lib/format/rupiah";
import BookingForm from "./BookingForm";

export const dynamic = "force-dynamic";

export default async function PaketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const profile = await getCurrentProfile();
  if (!profile) redirect(`/login?next=${encodeURIComponent(`/paket/${id}`)}`);

  const paket = await getPackageById(id);
  if (!paket) notFound();

  const zona = await getZonaAktif();

  // Returning? (member punya >=1 booking lunas) -> diskon otomatis.
  const admin = createAdminClient();
  const { count } = await admin
    .from("booking")
    .select("id, payment!inner(status_bayar)", { count: "exact", head: true })
    .eq("customer_profile_id", profile!.id)
    .eq("payment.status_bayar", "lunas");
  const returning = (count ?? 0) > 0;

  // Anak yang pernah diinput member (untuk dipilih ulang); tetap bisa tambah anak baru.
  // Hanya relevan bila vendor butuh data anak; selain itu kosongkan.
  const anak = paket.butuh_anak ? await getAnakByProfile(profile!.id) : [];

  return (
    <PublicShell>
      <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
        <Link href="/" className="text-sm text-foreground/50 underline">← Kembali</Link>
        <span className="mt-3 inline-block rounded-full bg-white px-3 py-1 text-xs font-extrabold text-pink-500 shadow-sm">
          {paket.layanan_nama}
        </span>
        <h1 className="mt-2 font-display text-2xl font-extrabold">{paket.nama}</h1>
        {paket.deskripsi && <p className="mt-1 text-foreground/60">{paket.deskripsi}</p>}
        <p className="mt-2 font-display text-2xl font-extrabold text-pink-500">{formatRupiah(paket.harga)}</p>
        <p className="text-xs text-foreground/45">±{paket.durasi_menit} menit · DP {paket.dp_persen}%</p>

        {paket.layanan_bank && (
          <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-3 text-sm text-foreground/70">
            <div className="font-bold">Transfer DP ke:</div>
            <div>{paket.layanan_bank} {paket.layanan_no_rek} a.n. {paket.layanan_atas_nama}</div>
            {paket.layanan_admin_wa && <div className="mt-1 text-xs text-foreground/50">Konfirmasi via WA: {paket.layanan_admin_wa}</div>}
          </div>
        )}

        <BookingForm
          packageId={paket.id}
          harga={paket.harga}
          dpPersen={paket.dp_persen}
          diskonReturning={paket.diskon_returning}
          returning={returning}
          zona={zona}
          anak={anak}
          butuhAnak={paket.butuh_anak}
        />
      </main>
    </PublicShell>
  );
}
