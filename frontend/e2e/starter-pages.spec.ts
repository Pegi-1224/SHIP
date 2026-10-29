import { expect, test } from '@playwright/test';
import { devCompleteAssessment, devSignIn } from './helpers';

/**
 * End-to-end checks for the starter-page scaffold, in a real browser against
 * the production build with Mock Service Worker running.
 *
 * These replace the previous `critical-flows.spec.ts`, which drove the
 * finished mock UI (forms, company cards, chat bubbles) that this refactor
 * intentionally removed from the rendered pages. What is worth proving in a
 * real browser now is narrower: the service worker actually starts, routing
 * and guards actually work, and the dev-only bypasses actually sign someone
 * in and complete the assessment using the real mock endpoints.
 */

test.describe('Signed-out visitor', () => {
  test('sees the Home page and dev index, and guarded routes redirect to login', async ({
    page,
  }) => {
    await page.goto('/');

    await expect(
      page.getByRole('heading', { name: 'Find a workplace that has your back.' }),
    ).toBeVisible();
    await expect(page.getByText('Demonstration mode.')).toBeVisible();
    await expect(page.getByText('Not signed in.')).toBeVisible();
    await expect(page.getByRole('link', { name: /Company profile \(example/ })).toBeVisible();

    await page.goto('/companies');
    await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible();
  });

  test('an unknown route renders the not-found page', async ({ page }) => {
    await page.goto('/this-route-does-not-exist');

    await expect(page.getByRole('heading', { name: 'We could not find that page' })).toBeVisible();
  });
});

test.describe('Dev sign-in and assessment shortcuts', () => {
  test('sign in, complete the assessment, and reach every guarded starter page', async ({
    page,
  }) => {
    await devSignIn(page, 'e2e.starter@example.com');

    // Assessment-gated route redirects to /assessment first.
    await page.goto('/companies');
    await expect(page.getByRole('heading', { name: 'Assessment' })).toBeVisible();

    await devCompleteAssessment(page);

    const routesAndHeadings: Array<[string, string]> = [
      ['/companies', 'Company Search'],
      ['/companies/new', 'Add Company'],
      ['/companies/northwind-systems/submit', 'Company Data Submission'],
      ['/compare', 'Compare Companies'],
      ['/discussions', 'Latest discussions'],
      ['/discussions/new', 'New Post'],
      ['/discussions/post_0001', 'How did you negotiate your first offer?'],
      ['/discussions/post_seed_1/edit', 'Edit Post'],
      ['/messages', 'Messages'],
      ['/profile', 'Profile'],
    ];

    for (const [route, heading] of routesAndHeadings) {
      await page.goto(route);
      await expect(page.getByRole('heading', { name: heading })).toBeVisible();
      await expect(
        page.getByText('Replace this placeholder when the UI design is ready.'),
      ).toBeVisible();
    }
  });

  test('a resolved route parameter is shown on the starter page', async ({ page }) => {
    await devSignIn(page, 'e2e.params@example.com');
    await devCompleteAssessment(page);

    await page.goto('/companies/northwind-systems/submit');

    await expect(page.getByText('companyId')).toBeVisible();
    await expect(page.getByText('northwind-systems')).toBeVisible();
  });

  test('signing out returns to the signed-out Home state', async ({ page }) => {
    await devSignIn(page, 'e2e.signout@example.com');

    await page.goto('/profile');
    await page.getByRole('button', { name: 'Sign out' }).click();

    await expect(page.getByRole('heading', { name: 'Home' })).toBeVisible();
    await expect(page.getByText('Not signed in.')).toBeVisible();
  });
});
