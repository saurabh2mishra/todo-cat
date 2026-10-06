import { expect, test } from "@playwright/test";

test("@model Lissie adds 'buy milk' and it appears in the sidebar", async ({
  page,
}) => {
  const email = `lissie-chat-${Date.now()}-${test.info().workerIndex}@example.com`;

  await page.goto("/");
  await page.getByRole("link", { name: "Create an account" }).click();
  await page.getByLabel("Name").fill("Lissie tester");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("tuna-o-clock");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/$/);

  // Ask Lissie to add "buy milk"
  const input = page.getByRole("textbox").last();
  await input.fill("Please add 'buy milk' to my list.");
  await input.press("Enter");

  // Wait for the agent run to finish
  await page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      new URL(response.url()).pathname.endsWith("/agent/lissie/run") &&
      response.ok(),
    { timeout: 60_000 },
  );

  // The sidebar should eventually show "buy milk" in the open section
  const sidebar = page.getByRole("complementary", { name: "To-do list" });
  await expect(sidebar.getByText("buy milk", { exact: false })).toBeVisible({
    timeout: 15_000,
  });
});
