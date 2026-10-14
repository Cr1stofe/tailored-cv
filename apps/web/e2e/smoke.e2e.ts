import { expect, test } from "@playwright/test";

test.describe("web application smoke flows", () => {
  test("redirects anonymous users from protected applications", async ({
    page,
  }) => {
    await page.goto("/applications");

    await expect(page).toHaveURL(/\/login\?callbackUrl=%2Fapplications/);
    await expect(
      page.getByRole("heading", { name: "Acessar Tailored CV" }),
    ).toBeVisible();
  });

  test("validates the login form before submitting", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Entrar na Plataforma" }).click();

    await expect(page.getByText("Informe um e-mail válido")).toBeVisible();
    await expect(page.getByText("A senha é obrigatória")).toBeVisible();
  });
});
