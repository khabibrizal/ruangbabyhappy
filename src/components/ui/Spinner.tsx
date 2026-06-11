export default function Spinner({ label = "Memuat…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-20 text-foreground/60">
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-pink-300 border-t-pink-500" />
      <span className="text-sm font-semibold">{label}</span>
    </div>
  );
}
