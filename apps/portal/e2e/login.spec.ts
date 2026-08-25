import { test, expect } from "@playwright/test"

test.describe("portal smoke", () => {
  test("login page renders", async ({ page }) => {
    await page.goto("/login")
    await expect(page.getByText("Nagar Panchayat Chhata")).toBeVisible()
    await expect(page.getByLabel("Email")).toBeVisible()
    await expect(page.getByLabel("Password")).toBeVisible()
    await expect(
      page.getByRole("button", { name: /Continue with Google/i })
    ).toBeVisible()
  })

  test("signup redirects to login", async ({ page }) => {
    await page.goto("/signup")
    await expect(page).toHaveURL(/\/login/)
  })
})
