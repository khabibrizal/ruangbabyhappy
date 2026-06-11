import { test, expect } from "@playwright/test";

const MEMBER = { email: "member@ruangbabyhappy.com", pass: "Member12345!" };
const ADMIN = { email: "admin@ruangbabyhappy.com", pass: "Admin12345!" };

async function login(page, who: { email: string; pass: string }, re: RegExp) {
  await page.goto("/login");
  await page.getByPlaceholder("Email").fill(who.email);
  await page.getByPlaceholder("Password").fill(who.pass);
  await page.getByRole("button", { name: /^Masuk$/ }).click();
  await expect(page).toHaveURL(re);
}

test("navbar auth-aware: member login -> tampil Transaksi & Keluar (bukan Daftar)", async ({ page }) => {
  await login(page, MEMBER, /\/member/);
  await page.goto("/");
  await expect(page.getByRole("link", { name: /^Transaksi$/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Keluar$/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /^Daftar$/ })).toHaveCount(0);
});

test("admin punya menu Jadwal & Galeri + filter pengerjaan", async ({ page }) => {
  await login(page, ADMIN, /\/admin/);
  await expect(page.getByRole("link", { name: /^Jadwal$/ })).toBeVisible();
  await page.goto("/admin/schedule");
  await expect(page.getByRole("heading", { name: /^Jadwal$/ })).toBeVisible();
  await page.goto("/admin/master");
  await expect(page.getByRole("link", { name: /^Galeri$/ })).toBeVisible();
  await page.goto("/admin/transaksi");
  await expect(page.locator('select[name="pengerjaan"]')).toBeVisible();
});
