import { test, expect, request as pwRequest } from "@playwright/test";
import fs from "node:fs";

const MEMBER_EMAIL = "member@ruangbabyhappy.com";
const MEMBER_PASS = "Member12345!";

function env(k: string): string {
  const line = fs.readFileSync(".env.local", "utf8").split("\n").find((l) => l.startsWith(k + "="));
  return line ? line.slice(k.length + 1).trim() : "";
}
const URL = env("NEXT_PUBLIC_SUPABASE_URL");
const KEY = env("SUPABASE_SERVICE_ROLE_KEY");

let paketId = "";
let layananId = "";

test.beforeAll(async () => {
  // UA non-browser: secret key Supabase ditolak (401) bila request tampak dari browser.
  const ctx = await pwRequest.newContext({ userAgent: "rbh-e2e-setup" });
  const lres = await ctx.get(`${URL}/rest/v1/layanan?select=id&limit=1`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
  });
  const ljson = await lres.json();
  if (!Array.isArray(ljson) || !ljson[0]) {
    throw new Error(`layanan fetch gagal: status=${lres.status()} url=${URL} keylen=${KEY.length} body=${JSON.stringify(ljson)}`);
  }
  layananId = ljson[0].id;
  const pres = await ctx.post(`${URL}/rest/v1/package`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json", Prefer: "return=representation" },
    data: { layanan_id: layananId, nama: `E2E-PAKET-${Date.now()}`, harga: 1000000, durasi_menit: 60, dp_persen: 30, diskon_returning: 0 },
  });
  paketId = (await pres.json())[0].id;
  await ctx.dispose();
});

test.afterAll(async () => {
  // UA non-browser: secret key Supabase ditolak (401) bila request tampak dari browser.
  const ctx = await pwRequest.newContext({ userAgent: "rbh-e2e-setup" });
  await ctx.delete(`${URL}/rest/v1/booking?package_id=eq.${paketId}`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
  });
  await ctx.delete(`${URL}/rest/v1/package?id=eq.${paketId}`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
  });
  await ctx.dispose();
});

async function loginMember(page) {
  await page.goto("/login");
  await page.getByPlaceholder("Email").fill(MEMBER_EMAIL);
  await page.getByPlaceholder("Password").fill(MEMBER_PASS);
  await page.getByRole("button", { name: /Masuk/i }).click();
  await expect(page).toHaveURL(/\/member/);
}

test("paket detail butuh login (redirect ke /login)", async ({ page }) => {
  await page.goto(`/paket/${paketId}`);
  await expect(page).toHaveURL(/\/login/);
});

test("member booking home service end-to-end", async ({ page }) => {
  await loginMember(page);
  await page.goto(`/paket/${paketId}`);

  const d = new Date(); d.setDate(d.getDate() + 14);
  const tgl = d.toISOString().slice(0, 10);
  await page.locator('input[name="tanggal"]').fill(tgl);

  await page.getByRole("button", { name: /Sesi/i }).first().click();

  await page.locator('input[name="anak_nama"]').fill("Bayi E2E");
  await page.locator('input[name="anak_bb"]').fill("3.5");
  await page.locator('select[name="anak_jk"]').selectOption("P");

  await page.locator('select[name="zonaId"]').selectOption({ index: 1 });
  await page.locator('textarea[name="alamat_sesi"]').fill("Jl. Uji No. 1");

  await expect(page.getByText(/Total/).first()).toBeVisible();
  await expect(page.getByText(/DP \(30%\)/)).toBeVisible();

  const buktiPath = "tests/e2e/_bukti.png";
  if (!fs.existsSync(buktiPath)) {
    fs.writeFileSync(buktiPath, Buffer.from("89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c6360000002000154a24f9b0000000049454e44ae426082", "hex"));
  }
  await page.locator('input[name="bukti"]').setInputFiles(buktiPath);

  await page.getByRole("button", { name: /Buat Booking/i }).click();

  await expect(page).toHaveURL(/\/booking\/RBH-/);
  await expect(page.getByText(/Booking Diterima/)).toBeVisible();
  await expect(page.getByRole("link", { name: /Chat Admin via WA/i })).toBeVisible();
});
