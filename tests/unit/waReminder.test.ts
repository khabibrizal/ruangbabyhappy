import { describe, it, expect } from "vitest";
import { buildReminderSesi, formatTanggalID } from "@/lib/booking/waReminder";

describe("formatTanggalID", () => {
  it("YYYY-MM-DD -> DD Bulan YYYY (id)", () => {
    expect(formatTanggalID("2026-06-12")).toBe("12 Juni 2026");
    expect(formatTanggalID("2026-01-05")).toBe("5 Januari 2026");
  });
  it("input tak cocok dikembalikan apa adanya", () => {
    expect(formatTanggalID("besok")).toBe("besok");
  });
});

describe("buildReminderSesi", () => {
  const base = { nama: "Dina", tanggal: "2026-06-12", jam: "09:00" };

  it("Newborn: body khusus + nama/tanggal/jam terisi", () => {
    const t = buildReminderSesi({ ...base, layanan: "Newborn" });
    expect(t).toContain("Hallo Kak Dina");
    expect(t).toContain("sesi Newborn Photo");
    expect(t).toContain("📅 Tanggal: 12 Juni 2026");
    expect(t).toContain("🕒 Jam: 09:00");
    expect(t).toContain("ASIP atau susu dalam botol");
    expect(t).toContain("Popok cadangan");
  });

  it("deteksi newborn case-insensitive (mis. 'Newborn 2025')", () => {
    expect(buildReminderSesi({ ...base, layanan: "newborn 2025" })).toContain("sesi Newborn Photo");
  });

  it("layanan lain: reminder umum (tanpa checklist newborn)", () => {
    const t = buildReminderSesi({ ...base, layanan: "Cakesmash" });
    expect(t).toContain("sesi Cakesmash");
    expect(t).not.toContain("ASIP atau susu dalam botol");
    expect(t).toContain("📅 Tanggal: 12 Juni 2026");
  });

  it("nama kosong -> fallback 'Kak'", () => {
    expect(buildReminderSesi({ ...base, nama: "", layanan: "Newborn" })).toContain("Hallo Kak Kak");
  });
});
