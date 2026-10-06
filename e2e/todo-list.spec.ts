import { expect, test } from "@playwright/test";

// Helpers shared across tests
async function signUpAndReachHome(
  page: import("@playwright/test").Page,
  name: string,
) {
  const email = `todo-${Date.now()}-${test.info().workerIndex}@example.com`;
  const password = "tuna-o-clock";

  await page.goto("/signup");
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/$/);
  return { email, password };
}

// Locate the checkbox inside the row for a given todo title.
function todoCheckbox(
  panel: import("@playwright/test").Locator,
  title: string,
) {
  return panel
    .locator(".todo-item")
    .filter({ hasText: title })
    .locator('input[type="checkbox"]');
}

test("add a to-do", async ({ page }) => {
  await signUpAndReachHome(page, "Tuna Fan");

  const panel = page.getByRole("complementary", { name: "To-do list" });
  await expect(panel).toBeVisible();

  await panel.getByLabel("New to-do title").fill("Buy more tuna");
  await panel.getByRole("button", { name: "Add to-do" }).click();

  await expect(panel.getByText("Buy more tuna")).toBeVisible();
});

test("add a to-do with a due date", async ({ page }) => {
  await signUpAndReachHome(page, "Planner Cat");

  const panel = page.getByRole("complementary", { name: "To-do list" });
  await panel.getByLabel("New to-do title").fill("Order fish on time");
  await panel.getByLabel("Due date (optional)").fill("2099-01-15");
  await panel.getByRole("button", { name: "Add to-do" }).click();

  await expect(panel.getByText("Order fish on time")).toBeVisible();
  // Due date is rendered as short month + day
  await expect(panel.getByText("Jan 15")).toBeVisible();
});

test("check off a to-do", async ({ page }) => {
  await signUpAndReachHome(page, "Done Cat");

  const panel = page.getByRole("complementary", { name: "To-do list" });
  await panel.getByLabel("New to-do title").fill("Nap aggressively");
  await panel.getByRole("button", { name: "Add to-do" }).click();
  await expect(panel.getByText("Nap aggressively")).toBeVisible();

  // Click the checkbox inside the todo row
  await todoCheckbox(panel, "Nap aggressively").click();

  // The row should now have the done modifier class
  await expect(
    panel.locator(".todo-item--done").filter({ hasText: "Nap aggressively" }),
  ).toBeVisible();
});

test("reopen a checked-off to-do", async ({ page }) => {
  await signUpAndReachHome(page, "Indecisive Cat");

  const panel = page.getByRole("complementary", { name: "To-do list" });
  await panel.getByLabel("New to-do title").fill("Decide on nap duration");
  await panel.getByRole("button", { name: "Add to-do" }).click();
  await expect(panel.getByText("Decide on nap duration")).toBeVisible();

  // Mark done
  await todoCheckbox(panel, "Decide on nap duration").click();
  await expect(
    panel
      .locator(".todo-item--done")
      .filter({ hasText: "Decide on nap duration" }),
  ).toBeVisible();

  // Reopen — click the same checkbox (now checked)
  await todoCheckbox(panel, "Decide on nap duration").click();
  await expect(
    panel
      .locator(".todo-item--done")
      .filter({ hasText: "Decide on nap duration" }),
  ).not.toBeVisible();
  await expect(panel.getByText("Decide on nap duration")).toBeVisible();
});

test("delete a to-do with confirmation", async ({ page }) => {
  await signUpAndReachHome(page, "Ruthless Cat");

  const panel = page.getByRole("complementary", { name: "To-do list" });
  await panel.getByLabel("New to-do title").fill("Scratch the couch");
  await panel.getByRole("button", { name: "Add to-do" }).click();
  await expect(panel.getByText("Scratch the couch")).toBeVisible();

  const row = panel
    .locator(".todo-item")
    .filter({ hasText: "Scratch the couch" });

  // Hover to reveal the × button, then click it
  await row.hover();
  await row.getByLabel("Delete: Scratch the couch").click();

  // Confirmation should appear
  await expect(panel.getByText(/Remove "Scratch the couch"/)).toBeVisible();

  // Cancel — item should still be there
  await panel.getByRole("button", { name: "Cancel" }).click();
  await expect(panel.getByText("Scratch the couch")).toBeVisible();

  // Delete for real
  await row.hover();
  await row.getByLabel("Delete: Scratch the couch").click();
  await panel.getByRole("button", { name: "Remove" }).click();

  await expect(panel.getByText("Scratch the couch")).not.toBeVisible();
});
