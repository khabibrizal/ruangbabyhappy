import { test, expect, request as pwRequest } from "@playwright/test";
import fs from "node:fs";

const ADMIN = { email: "admin@ruangbabyhappy.com", pass: "Admin12345!" };
function env(k: string) { const l = fs.readFileSync(".env.local", "utf8").split("\n").find((x) => x.startsWith(k + "=")); return l ? l.slice(k.length + 1).trim() : ""; }
const URL = env("NEXT_PUBLIC_SUPABASE_URL"), KEY = env("SUPABASE_SERVICE_ROLE_KEY");
let kode = "";

test.afterAll(async () => {
  const ctx = await pwRequest.newContext({ userAgent: "rbh-e2e-setup" });
  const h = { apikey: KEY, Authorization: `Bearer ${KEY}` };
  if (kode) await ctx.delete(`${URL}/rest/v1/booking?kode_booking=eq.${kode}`, { headers: h });
  await ctx.dispose();
});

test("admin buat transaksi multi-item utk customer terdaftar", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder("Email").fill(ADMIN.email);
  await page.getByPlaceholder("Password").fill(ADMIN.pass);
  await page.getByRole("button", { name: /^Masuk$/ }).click();
  await expect(page).toHaveURL(/\/admin/);

  await page.goto("/admin/transaksi");
  await page.getByRole("link", { name: /Transaksi Baru/i }).click();
  await expect(page).toHaveURL(/\/admin\/transaksi\/baru/);

  // cari customer member by nama
  await page.getByPlaceholder(/Cari no WA/i).fill("Member");
  await page.getByRole("button", { name: /^Cari$/ }).click();
  await page.getByRole("button", { name: /Member Contoh/ }).click();

  // anak
  await page.locator('input[name="anak_nama"]').fill("Bayi Trx");
  await page.locator('input[name="anak_bb"]').fill("3.0");
  await page.locator('select[name="anak_jk"]').selectOption("L");

  // qty 2 pada produk pertama
  await page.locator('section:has-text("Produk") input[type="number"]').first().fill("2");

  // status lunas
  await page.locator('select[name="status"]').selectOption("lunas");

  await page.getByRole("button", { name: /Simpan Transaksi/i }).click();
  await expect(page).toHaveURL(/\/admin\/transaksi\/RBH-/);
  kode = (page.url().match(/RBH-[A-Z0-9-]+/) ?? [""])[0];
  await expect(page.getByText(/Item/).first()).toBeVisible();

  const inv = await page.request.get(`/invoice/${kode}`);
  expect(inv.headers()["content-type"]).toContain("application/pdf");
});
