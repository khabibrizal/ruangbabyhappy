import { test, expect } from "@playwright/test";

const ADMIN_EMAIL = "admin@ruangbabyhappy.com";
const ADMIN_PASS = "Admin12345!";

async function loginAdmin(page) {
  await page.goto("/login");
  await page.getByPlaceholder("Email").fill(ADMIN_EMAIL);
  await page.getByPlaceholder("Password").fill(ADMIN_PASS);
  await page.getByRole("button", { name: /Masuk/i }).click();
  await expect(page).toHaveURL(/\/admin/);
}

test("admin bisa buka hub master & daftar layanan tampil", async ({ page }) => {
  await loginAdmin(page);
  await page.goto("/admin/master/layanan");
  await expect(page.getByRole("heading", { name: /Master Layanan/i })).toBeVisible();
  // Seed: Newborn ada (input ber-defaultValue -> render value attribute di SSR)
  await expect(page.locator('input[value="Newborn"]')).toBeVisible();
});

test("admin tambah paket uji lalu menonaktifkannya (self-clean)", async ({ page }) => {
  await loginAdmin(page);
  await page.goto("/admin/master/paket");
  const namaUji = `PAKET-UJI-${Date.now()}`;
  await page.locator('select[name="layanan_id"]').first().selectOption({ index: 1 });
  await page.locator('input[name="nama"]').first().fill(namaUji);
  await page.locator('input[name="harga"]').first().fill("123456");
  await page.locator('input[name="durasi_menit"]').first().fill("60");
  await page.getByRole("button", { name: /Tambah Paket/i }).click();
  await expect(page.locator(`input[value="${namaUji}"]`)).toBeVisible();

  // Self-clean: nonaktifkan paket uji (tombol toggle pada kartu yang punya nama itu)
  const kartu = page.locator("div.rounded.border", { has: page.locator(`input[value="${namaUji}"]`) });
  await kartu.getByRole("button", { name: /Nonaktifkan/i }).click();
  await expect(kartu.getByRole("button", { name: /Aktifkan/i })).toBeVisible();
});
