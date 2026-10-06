import { expect, test } from "@playwright/test";

test("@model Lissie replies in the user's list thread", async ({ page }) => {
  const email = `lissie-chat-${Date.now()}-${test.info().workerIndex}@example.com`;

  await page.goto("/");
  await page.getByRole("link", { name: "Create an account" }).click();
  await page.getByLabel("Name").fill("Lissie tester");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("tuna-o-clock");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/$/);

  const runResponse = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      new URL(response.url()).pathname.endsWith("/agent/lissie/run"),
  );
  const input = page.getByRole("textbox").last();
  await input.fill("I need to remember to buy milk.");
  await input.press("Enter");

  const response = await runResponse;
  expect(response.ok()).toBe(true);
  expect(await response.text()).toContain("RUN_FINISHED");
});
