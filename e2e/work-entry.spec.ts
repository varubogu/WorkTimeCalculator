import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
  });
});

test("勤務時間を入力すると月合計と日付セルに反映される", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: /2026-04-01 記録を追加/ }).click();
  await page.getByLabel("開始時間").fill("09:00");
  await page.getByLabel("終了時間").fill("18:00");
  await page.getByLabel(/休憩/).fill("60");
  await expect(page.locator(".modal-computed")).toHaveText("8h");

  await page.getByRole("button", { name: "保存" }).click();

  await expect(page.getByRole("button", { name: /2026-04-01 記録を追加/ })).toContainText("8h");
  await expect(page.locator(".desktop-only").getByLabel("合計時間")).toHaveText("8h");
});
