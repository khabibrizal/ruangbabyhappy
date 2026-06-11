import { NextResponse } from "next/server";
import { getSesiTersedia } from "@/lib/booking/sesiAvailability";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const paket = searchParams.get("paket");
  const tanggal = searchParams.get("tanggal");
  if (!paket || !tanggal || !/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) {
    return NextResponse.json({ error: "param paket & tanggal (YYYY-MM-DD) wajib" }, { status: 400 });
  }
  const sesi = await getSesiTersedia(paket, tanggal);
  return NextResponse.json({ sesi });
}
