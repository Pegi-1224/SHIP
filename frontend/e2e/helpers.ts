import { expect, type Page } from '@playwright/test';

/**
 * Signs in using the development-only shortcut in Home's developer box
 * (see `src/features/home/pages/HomePage.tsx` -> `SessionPanel`). It drives
 * the same mock sign-in endpoints a real form would, just without a form:
 * this is "reuse the existing mock session mechanism" from the refactor
 * brief, not a separate fake login.
 */
export async function devSignIn(page: Page, email: string): Promise<void> {
  await page.goto('/');
  await expect(page.getByText('All starter pages')).toBeVisible();

  const emailInput = page.getByLabel('Dev sign-in email');
  await emailInput.fill(email);
  await page.getByRole('button', { name: 'Dev sign in (mock)' }).click();

  // Signed in: the sign-in control is replaced by the "Signed in as" text.
  await expect(page.getByText(`Signed in as ${email}`)).toBeVisible();
}

/**
 * Completes the assessment by answering the real five-question form, so the `RequireAssessment`
 * guard clears. (It used to be a dev-only button on the starter page; the page is now real.)
 */
export async function completeAssessment(page: Page): Promise<void> {
  await page.goto('/assessment');
  await expect(page.getByRole('heading', { name: 'Personalize your SHIP' })).toBeVisible();

  const next = page.getByRole('button', { name: 'Next' });
  await page.getByText('Employed and looking to switch').click();
  await next.click();
  await page.getByText('Tech', { exact: true }).click();
  await next.click();
  await page.getByText('Company culture').click();
  await next.click();
  await page.getByText('#pay gap').click();
  await next.click();
  await page.getByRole('button', { name: 'Finish' }).click();

  // A new account is sent Home once the answers are saved.
  await expect(page).toHaveURL(/\/$/);
}
