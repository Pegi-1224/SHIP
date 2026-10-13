import { expect, test } from '@playwright/test';
import { signUpAndOnboard } from './helpers';

/**
 * End-to-end checks for the flows that would make the product unusable if they
 * broke. Everything runs against the mock backend in a real browser, so these
 * also prove that Mock Service Worker starts correctly from a production build.
 */

test.describe('Signed-out visitor', () => {
  test('sees the preview and no search bars, and is sent to sign-in', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'Know what it is really like',
    );
    await expect(page.getByText('Demonstration mode.')).toBeVisible();

    // Spec 2.2 / AC-3: no search bars at all for a signed-out visitor.
    await expect(page.getByLabel('Search companies')).toHaveCount(0);
    await expect(page.getByLabel('Search discussions')).toHaveCount(0);

    await expect(page.getByText('What people are discussing')).toBeVisible();

    // A protected route redirects to sign-in rather than failing.
    await page.goto('/companies');
    await expect(page).toHaveURL(/\/login\?redirectTo=/);
  });
});

test.describe('Company research', () => {
  test('search, open a profile, and see the privacy threshold in action', async ({ page }) => {
    await signUpAndOnboard(page, 'e2e.company@example.com');

    await page.goto('/companies');
    // The header carries its own search box, so scope to the page content.
    const main = page.getByRole('main');
    await main.getByLabel('Search companies').fill('Harborline');
    await page.keyboard.press('Enter');

    await main.getByRole('link', { name: 'Harborline Financial' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Harborline Financial');

    const salary = page.getByRole('region', { name: 'Salary' });
    await expect(salary.getByText('Public data').first()).toBeVisible();
    // Four contributors only, so the user-reported aggregate is withheld.
    await expect(
      salary.getByText(/We show averages once 5 people have contributed/),
    ).toBeVisible();
    await expect(salary.getByText('Median reported salary')).toHaveCount(0);
  });

  test('submitting the fifth report reveals the aggregate', async ({ page }) => {
    await signUpAndOnboard(page, 'e2e.fifth@example.com');

    await page.goto('/companies/harborline-financial');
    const salary = page.getByRole('region', { name: 'Salary' });
    await expect(salary.getByText(/We show averages once 5 people/)).toBeVisible();

    await salary.getByRole('button', { name: 'Share your data' }).first().click();

    await expect(page.getByRole('heading', { level: 1 })).toContainText('Share your data');
    const salarySwitch = page.getByRole('switch', { name: /Include Salary/ });
    await expect(salarySwitch).toBeChecked();

    // Mantine renders a Select as a combobox plus a hidden input, so target
    // the combobox role rather than the label alone.
    await page.getByRole('combobox', { name: 'Role' }).click();
    await page.getByRole('option', { name: 'Financial Analyst' }).click();
    await page.getByRole('combobox', { name: 'Level' }).click();
    await page.getByRole('option', { name: 'Senior', exact: true }).click();
    await page.getByRole('combobox', { name: 'City' }).click();
    await page.getByRole('option', { name: 'New York, NY' }).click();
    await page.getByLabel('Annual base salary (USD)').fill('180000');

    await page.getByRole('button', { name: 'Submit', exact: true }).click();

    // Back on the profile, the aggregate is now published.
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Harborline Financial');
    await expect(
      page.getByRole('region', { name: 'Salary' }).getByText('Median reported salary'),
    ).toBeVisible();
  });

  test('comparison refuses to rank figures that measure different things', async ({ page }) => {
    await signUpAndOnboard(page, 'e2e.compare@example.com');

    await page.goto('/compare?a=northwind-systems&b=cobalt-grid');

    await expect(page.getByText('Summary')).toBeVisible();
    await expect(
      page
        .getByText('These figures for women support and diversity are not directly comparable.')
        .first(),
    ).toBeVisible();
    await expect(page.getByText('Some figures could not be compared')).toBeVisible();
  });
});

test.describe('Discussions and messaging', () => {
  test('write a post, comment on it, then message another author', async ({ page }) => {
    await signUpAndOnboard(page, 'e2e.discussion@example.com');

    await page.goto('/discussions');
    await page.getByRole('button', { name: 'New post' }).click();

    await page.getByLabel('Title').fill('How did you prepare for a levelling conversation?');
    await page
      .getByLabel('Your post')
      .fill('Looking for what people actually brought to the meeting.');
    await page.getByRole('combobox', { name: 'Tag name' }).fill('negotiation');
    await page.getByRole('button', { name: 'Add' }).click();
    await page.getByRole('button', { name: 'Publish' }).click();

    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'How did you prepare for a levelling conversation?',
    );
    // The author sees their own controls.
    await expect(page.getByRole('button', { name: 'Edit' })).toBeVisible();

    await page.getByLabel('Add a comment').fill('Adding my own follow-up.');
    await page.getByRole('button', { name: 'Post comment' }).click();
    await expect(page.getByText('Adding my own follow-up.')).toBeVisible();

    // Message the author of a different, seeded post.
    await page.goto('/discussions');
    await page.getByRole('button', { name: /^Message Anonymous/ }).first().click();

    await expect(page).toHaveURL(/\/messages\//);
    await page.getByRole('textbox', { name: 'Message' }).fill('Your post was useful, thank you.');
    await page.getByRole('button', { name: 'Send' }).click();
    await expect(page.getByText('Your post was useful, thank you.')).toBeVisible();
  });

  test('a failed send keeps the text and retrying does not duplicate it', async ({ page }) => {
    await signUpAndOnboard(page, 'e2e.retry@example.com');

    await page.goto('/discussions');
    await page.getByRole('button', { name: /^Message Anonymous/ }).first().click();
    await expect(page).toHaveURL(/\/messages\//);

    const composer = page.getByRole('textbox', { name: 'Message' });
    // "!fail" makes the mock backend reject the first attempt only.
    await composer.fill('Trying again after a !fail');
    await page.getByRole('button', { name: 'Send' }).click();

    const failureAlert = page.getByRole('alert').filter({ hasText: 'Your message was not sent' });
    await expect(failureAlert).toBeVisible();
    await expect(composer).toHaveValue('Trying again after a !fail');

    await failureAlert.getByRole('button', { name: 'Retry' }).click();

    await expect(page.getByText('Trying again after a !fail')).toHaveCount(1);
    await expect(composer).toHaveValue('');
  });
});

test.describe('Account', () => {
  test('deleting the account signs the user out and clears their contributions', async ({
    page,
  }) => {
    await signUpAndOnboard(page, 'e2e.delete@example.com');

    await page.goto('/discussions/new');
    await page.getByLabel('Title').fill('A post that will be deleted with my account');
    await page.getByLabel('Your post').fill('Temporary content for the deletion check.');
    await page.getByRole('combobox', { name: 'Tag name' }).fill('career goals');
    await page.getByRole('button', { name: 'Add' }).click();
    await page.getByRole('button', { name: 'Publish' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('deleted with my account');

    await page.goto('/profile');
    await expect(
      page.getByRole('heading', { level: 3, name: /deleted with my account/ }),
    ).toBeVisible();

    await page.getByRole('button', { name: 'Delete my account' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('button', { name: 'Delete everything' })).toBeDisabled();
    await dialog.getByLabel('Type DELETE to confirm').fill('DELETE');
    await dialog.getByRole('button', { name: 'Delete everything' }).click();

    // Signed out: the header shows the sign-up call to action again.
    await expect(page.getByRole('banner').getByRole('button', { name: 'Sign up' })).toBeVisible();

    // The post is gone for everyone, not just hidden from its author.
    await page.goto('/discussions');
    await expect(page).toHaveURL(/\/login\?redirectTo=/);
  });
});

test.describe('Not found', () => {
  test('an unknown URL renders the not-found page', async ({ page }) => {
    await page.goto('/this-route-does-not-exist');

    await expect(page.getByRole('heading', { name: 'We could not find that page' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Go to home' })).toBeVisible();
  });
});
