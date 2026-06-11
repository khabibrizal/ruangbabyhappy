import { test, expect } from "@playwright/test";

test("landing tampil dengan brand & CTA", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /si kecil/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /Booking Sekarang/i })).toBeVisible();
});

test("akses /admin tanpa login diarahkan ke /login", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login/);
});

test("akses /member tanpa login diarahkan ke /login", async ({ page }) => {
  await page.goto("/member");
  await expect(page).toHaveURL(/\/login/);
});
