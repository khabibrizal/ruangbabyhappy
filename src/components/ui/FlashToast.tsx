"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Toast notifikasi global untuk feedback Server Action.
 * Membaca `?ok=<pesan>` / `?error=<pesan>` dari URL, menampilkan toast 3.5 detik
 * (hijau utk ok, merah utk error), lalu membersihkan param dgn router.replace.
 * `?ok=1` (tanpa pesan) tetap tampil sebagai "Perubahan tersimpan." (kompat lama).
 * Wajib dibungkus <Suspense> di layout karena pakai useSearchParams.
 */
export default function FlashToast() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const ok = sp.get("ok");
  const error = sp.get("error");
  const [toast, setToast] = useState<{ tipe: "ok" | "error"; pesan: string } | null>(null);

  useEffect(() => {
    if (!ok && !error) return;
    const pesan = error ?? (ok === "1" ? "Perubahan tersimpan." : ok ?? "");
    setToast({ tipe: error ? "error" : "ok", pesan });
    const params = new URLSearchParams(Array.from(sp.entries()));
    params.delete("ok");
    params.delete("error");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ok, error]);

  if (!toast) return null;
  return (
    <div
      role="status"
      className={`fixed bottom-4 right-4 z-50 max-w-sm rounded-lg px-4 py-3 text-sm shadow-lg ${
        toast.tipe === "ok" ? "bg-green-600 text-white" : "bg-red-600 text-white"
      }`}
    >
      {toast.pesan}
    </div>
  );
}
