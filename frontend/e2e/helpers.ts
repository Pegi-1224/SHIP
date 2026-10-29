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
 * Completes the assessment using the development-only shortcut on the
 * Assessment starter page, so the `RequireAssessment` guard clears without
 * driving the real five-question form.
 */
export async function devCompleteAssessment(page: Page): Promise<void> {
  await page.goto('/assessment');
  await page.getByRole('button', { name: 'Dev: complete assessment with default answers' }).click();
  await expect(page.getByText('Assessment already completed for this session.')).toBeVisible();
}
