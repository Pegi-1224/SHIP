import { expect, type Page } from '@playwright/test';

/**
 * Signs in through the real UI using the mock email-code flow, then completes
 * the assessment so the signed-in routes are reachable.
 *
 * Every browser context starts with empty storage, so each test gets a fresh
 * mock database and a brand-new account.
 *
 * Each step asserts before moving on. A helper that fails silently turns every
 * test that uses it into a confusing timeout somewhere else.
 */
export async function signUpAndOnboard(page: Page, email: string): Promise<void> {
  await page.goto('/login');

  await page.getByLabel('I am a woman aged 18 or older').check();
  await page.getByLabel('Email address').fill(email);
  await page.getByRole('button', { name: 'Send verification code' }).click();

  // The mock API returns the code it generated, in a clearly labelled panel.
  const codePanel = page.getByText('Mock code — no email was sent');
  await expect(codePanel).toBeVisible();

  const code = ((await page.locator('code').first().textContent()) ?? '').trim();
  expect(code).toMatch(/^\d{6}$/);

  // The 6-digit PinInput is a row of single-character fields.
  const pinFields = page.locator('#verification-code input');
  await expect(pinFields).toHaveCount(6);
  await pinFields.first().click();
  await page.keyboard.type(code);

  await page.getByRole('button', { name: 'Verify and continue' }).click();

  await completeAssessment(page);
}

/** Answers the five assessment questions with a fixed, predictable set. */
export async function completeAssessment(page: Page): Promise<void> {
  await expect(page.getByText('Question 1 of 5')).toBeVisible();
  await page.getByRole('radio', { name: 'Employed and looking to switch' }).check();
  await page.getByRole('button', { name: 'Next' }).click();

  await expect(page.getByText('Question 2 of 5')).toBeVisible();
  await page.getByRole('checkbox', { name: 'Tech' }).check();
  await page.getByRole('button', { name: 'Next' }).click();

  await expect(page.getByText('Question 3 of 5')).toBeVisible();
  await page.getByRole('checkbox', { name: 'Pay equity' }).check();
  await page.getByRole('button', { name: 'Next' }).click();

  await expect(page.getByText('Question 4 of 5')).toBeVisible();
  await page.getByRole('checkbox', { name: '#pay gap' }).check();
  await page.getByRole('button', { name: 'Next' }).click();

  // Question 5 is optional.
  await expect(page.getByText(/Question 5 of 5/)).toBeVisible();
  await page.getByRole('button', { name: 'Finish' }).click();

  // The walkthrough opens once the assessment is saved, which is also the
  // proof that it was saved.
  await dismissWalkthrough(page);

  await expect(page).toHaveURL(/\/$/);
}

export async function dismissWalkthrough(page: Page): Promise<void> {
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('How SHIP works')).toBeVisible();

  // Six steps, one per page of the app.
  for (let step = 0; step < 5; step += 1) {
    await dialog.getByRole('button', { name: 'Next' }).click();
  }

  await dialog.getByRole('button', { name: 'Got it' }).click();
  await expect(dialog).toBeHidden();
}
