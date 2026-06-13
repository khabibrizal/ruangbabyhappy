import Spinner from "@/components/ui/Spinner";

// Boundary loading utk transisi ke halaman detail customer (force-dynamic) ->
// klik langsung menampilkan spinner & mengaktifkan prefetch shell oleh <Link>.
export default function Loading() {
  return <Spinner />;
}
