import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";

export default async function MemberPage() {
  const profile = await getCurrentProfile();
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-2xl font-extrabold">Halo, {profile?.nama ?? "Member"} 👋</h1>
      <p className="mt-2 font-semibold text-foreground/60">Dashboard member — riwayat booking & tracking menyusul.</p>
      <form action="/logout" method="post" className="mt-4">
        <button className="rounded-full bg-white px-4 py-2 text-sm font-bold ring-1 ring-black/10">Keluar</button>
      </form>
    </main>
  );
}
