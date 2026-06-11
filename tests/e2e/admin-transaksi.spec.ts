import { test, expect, request as pwRequest } from "@playwright/test";
import fs from "node:fs";

const ADMIN = { email: "admin@ruangbabyhappy.com", pass: "Admin12345!" };
const MEMBER = { email: "member@ruangbabyhappy.com", pass: "Member12345!" };

function env(k: string): string {
  const l = fs.readFileSync(".env.local", "utf8").split("\n").find((x) => x.startsWith(k + "="));
  return l ? l.slice(k.length + 1).trim() : "";
}
const URL = env("NEXT_PUBLIC_SUPABASE_URL");
const KEY = env("SUPABASE_SERVICE_ROLE_KEY");

let paketId = "", bookingId = "", kode = "", memberId = "", sesiId = "";

test.beforeAll(async () => {
  const ctx = await pwRequest.newContext({ userAgent: "rbh-e2e-setup" });
  const h = { apikey: KEY, Authorization: `Bearer ${KEY}` };
  const hj = { ...h, "Content-Type": "application/json", Prefer: "return=representation" };

  const layananId = (await (await ctx.get(`${URL}/rest/v1/layanan?select=id&limit=1`, { headers: h })).json())[0].id;
  sesiId = (await (await ctx.get(`${URL}/rest/v1/sesi?select=id&order=urutan&limit=1`, { headers: h })).json())[0].id;
  memberId = (await (await ctx.get(`${URL}/rest/v1/profiles?select=id&email=eq.${encodeURIComponent(MEMBER.email)}`, { headers: h })).json())[0].id;

  paketId = (await (await ctx.post(`${URL}/rest/v1/package`, { headers: hj, data: { layanan_id: layananId, nama: `E2E-ADM-${Date.now()}`, harga: 1000000, durasi_menit: 60, dp_persen: 30, diskon_returning: 0 } })).json())[0].id;
  kode = `RBH-ADMIN-${Date.now()}`;
  bookingId = (await (await ctx.post(`${URL}/rest/v1/booking`, { headers: hj, data: { kode_booking: kode, package_id: paketId, sesi_id: sesiId, customer_profile_id: memberId, anak_nama: "Bayi Adm", anak_bb: 3.2, anak_jk: "L", lokasi_sesi: "studio", tanggal: new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10), jam_mulai: "09:00", status_booking: "pending" } })).json())[0].id;
  await ctx.post(`${URL}/rest/v1/payment`, { headers: hj, data: { booking_id: bookingId, total: 1000000, ongkos: 0, diskon: 0, dp_amount: 300000, status_bayar: "unpaid" } });
  await ctx.dispose();
});

test.afterAll(async () => {
  const ctx = await pwRequest.newContext({ userAgent: "rbh-e2e-setup" });
  const h = { apikey: KEY, Authorization: `Bearer ${KEY}` };
  await ctx.delete(`${URL}/rest/v1/booking?id=eq.${bookingId}`, { headers: h });
  await ctx.delete(`${URL}/rest/v1/package?id=eq.${paketId}`, { headers: h });
  await ctx.dispose();
});

async function login(page, who: { email: string; pass: string }, urlRe: RegExp) {
  await page.goto("/login");
  await page.getByPlaceholder("Email").fill(who.email);
  await page.getByPlaceholder("Password").fill(who.pass);
  await page.getByRole("button", { name: /Masuk/i }).click();
  await expect(page).toHaveURL(urlRe);
}

test("admin set Lunas + status pengerjaan Edit, lalu member lihat stepper", async ({ page }) => {
  await login(page, ADMIN, /\/admin/);
  await page.goto(`/admin/transaksi/${kode}`);
  await expect(page.getByRole("heading", { name: /Detail Transaksi/i })).toBeVisible();

  // Set Lunas
  await page.locator('select[name="status"]').selectOption("lunas");
  await page.getByRole("button", { name: /^Simpan$/ }).click();
  await expect(page.getByText(/Perubahan tersimpan/)).toBeVisible();

  // Status pengerjaan -> Edit
  await page.locator('select[name="status_pengerjaan"]').selectOption("edit");
  await page.getByRole("button", { name: /Simpan Status/i }).click();
  await expect(page.getByText(/Perubahan tersimpan/)).toBeVisible();

  // Invoice PDF
  const inv = await page.request.get(`/invoice/${kode}`);
  expect(inv.headers()["content-type"]).toContain("application/pdf");
  expect((await inv.body()).length).toBeGreaterThan(500);

  // Member lihat stepper "Edit"
  await page.context().clearCookies();
  await login(page, MEMBER, /\/member/);
  await expect(page.getByText(kode)).toBeVisible();
  await expect(page.getByText("Edit").first()).toBeVisible();
});
