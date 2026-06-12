import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PublicShell from "@/components/public/PublicShell";
import { getPackageById, getZonaAktif } from "@/lib/catalog/queries";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAnakByProfile } from "@/lib/member/anak";
import { formatRupiah } from "@/lib/format/rupiah";
import { brand } from "@/lib/brand";
import { buildMetadata } from "@/lib/seo/config";
import { productOffer, breadcrumb } from "@/lib/seo/jsonld";
import JsonLd from "@/components/seo/JsonLd";
import { btnGrad } from "@/components/ui/buttons";
import BookingForm from "./BookingForm";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const paket = await getPackageById(id);
  if (!paket) return { title: "Paket tidak ditemukan — Ruang Baby Happy" };
  const desc = (paket.deskripsi ?? `${paket.nama} di Ruang Baby Happy ${brand.kota}`)
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 155);
  return buildMetadata({
    title: `${paket.nama} — ${paket.layanan_nama} ${formatRupiah(paket.harga)} | Ruang Baby Happy ${brand.kota}`,
    description: desc,
    path: `/paket/${id}`,
    image: paket.foto_url,
  });
}

export default async function PaketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const paket = await getPackageById(id);
  if (!paket) notFound();

  // Detail paket publik (untuk SEO). Data booking hanya diambil bila sudah login.
  const profile = await getCurrentProfile();

  let returning = false;
  let anak: Awaited<ReturnType<typeof getAnakByProfile>> = [];
  let zona: Awaited<ReturnType<typeof getZonaAktif>> = [];
  if (profile) {
    zona = await getZonaAktif();
    const admin = createAdminClient();
    const { count } = await admin
      .from("booking")
      .select("id, payment!inner(status_bayar)", { count: "exact", head: true })
      .eq("customer_profile_id", profile.id)
      .eq("payment.status_bayar", "lunas");
    returning = (count ?? 0) > 0;
    anak = paket.butuh_anak ? await getAnakByProfile(profile.id) : [];
  }

  return (
    <PublicShell>
      <JsonLd
        data={productOffer({
          nama: paket.nama,
          deskripsi: paket.deskripsi,
          harga: paket.harga,
          image: paket.foto_url,
          layananNama: paket.layanan_nama,
          path: `/paket/${id}`,
        })}
      />
      <JsonLd
        data={breadcrumb([
          { name: "Beranda", path: paket.vendor_is_default ? "/" : `/v/${paket.vendor_slug}` },
          { name: paket.layanan_nama, path: paket.vendor_is_default ? "/" : `/v/${paket.vendor_slug}` },
          { name: paket.nama, path: `/paket/${id}` },
        ])}
      />
      <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
        <Link href={paket.vendor_is_default ? "/" : `/v/${paket.vendor_slug}`} className="text-sm text-foreground/50 underline">
          ← Kembali ke {paket.vendor_nama}
        </Link>
        <span className="mt-3 inline-block rounded-full bg-white px-3 py-1 text-xs font-extrabold text-pink-500 shadow-sm">
          {paket.layanan_nama}
        </span>
        <h1 className="mt-2 font-display text-2xl font-extrabold">{paket.nama}</h1>
        {paket.deskripsi && <p className="mt-1 whitespace-pre-line text-foreground/60">{paket.deskripsi}</p>}
        <p className="mt-2 font-display text-2xl font-extrabold text-pink-500">{formatRupiah(paket.harga)}</p>
        <p className="text-xs text-foreground/45">±{paket.durasi_menit} menit · DP {paket.dp_persen}%</p>

        {paket.layanan_bank && (
          <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-3 text-sm text-foreground/70">
            <div className="font-bold">Transfer DP ke:</div>
            <div>{paket.layanan_bank} {paket.layanan_no_rek} a.n. {paket.layanan_atas_nama}</div>
            {paket.layanan_admin_wa && <div className="mt-1 text-xs text-foreground/50">Konfirmasi via WA: {paket.layanan_admin_wa}</div>}
          </div>
        )}

        {profile ? (
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
        ) : (
          <div className="mt-5 rounded-2xl border border-pink-200 bg-pink-50 p-4 text-center">
            <p className="text-sm font-semibold text-foreground/70">Mau booking paket ini?</p>
            <Link
              href={`/login?next=${encodeURIComponent(`/paket/${id}`)}`}
              className={`${btnGrad} mt-2 inline-block`}
            >
              Masuk untuk booking
            </Link>
          </div>
        )}
      </main>
    </PublicShell>
  );
}
