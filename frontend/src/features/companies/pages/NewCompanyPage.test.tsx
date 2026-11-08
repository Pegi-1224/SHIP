import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import { signInTestUser } from '@/test/signIn';
import { AppRoutes } from '@/app/router/AppRoutes';

function renderAt(route: string) {
  return renderWithProviders(<AppRoutes />, { route });
}

describe('NewCompanyPage, step 1', () => {
  it('pre-fills the searched name and has no header search bar', async () => {
    renderAt('/companies/new?name=Fernleaf%20Studio');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Add this company' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Step 1 of 2')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Company name' })).toHaveValue('Fernleaf Studio');
    expect(screen.queryByRole('textbox', { name: /^Search/ })).not.toBeInTheDocument();
  });

  it('asks for the industry and state before going on', async () => {
    const { user } = renderAt('/companies/new?name=Fernleaf%20Studio');

    await user.click(await screen.findByRole('button', { name: /Next: share your data/ }));

    expect(screen.getByText('Select an industry.')).toBeInTheDocument();
    expect(screen.getByText('Select a U.S. state.')).toBeInTheDocument();
    expect(screen.getByText('Step 1 of 2')).toBeInTheDocument();
  });

  it('suggests similar companies and links to one that already exists', async () => {
    const { user } = renderAt('/companies/new');

    await user.type(await screen.findByRole('combobox', { name: 'Company name' }), 'orchid');
    await user.click(await screen.findByRole('option', { name: /Orchid Ridge Bank/ }));

    expect(screen.getByText('Orchid Ridge Bank is already on SHIP.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to Orchid Ridge Bank ›' })).toHaveAttribute(
      'href',
      '/companies/orchid-ridge-bank',
    );
  });

  it('lists the names starting with a single typed letter first', async () => {
    const { user } = renderAt('/companies/new');

    await user.type(await screen.findByRole('combobox', { name: 'Company name' }), 'm');
    await screen.findByRole('listbox');

    // Marigold Mobility starts with M; Lumen Harbor Analytics only has an "m" inside.
    expect(screen.getAllByRole('option')[0]).toHaveTextContent('Marigold Mobility');
  });

  it('lets the similar names be picked with the keyboard, like a select', async () => {
    const { user } = renderAt('/companies/new');

    const name = await screen.findByRole('combobox', { name: 'Company name' });
    await user.type(name, 'orchid');
    await screen.findByRole('option', { name: /Orchid Ridge Bank/ });
    const [first] = screen.getAllByRole('option');
    await user.keyboard('{ArrowDown}');
    expect(first).toHaveAttribute('aria-selected', 'true');
    expect(name).toHaveAttribute('aria-activedescendant', first?.id);
    await user.keyboard('{Enter}');

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/is already on SHIP./);
  });
});

describe('NewCompanyPage, step 2', () => {
  async function fillStepOne(user: ReturnType<typeof renderAt>['user']) {
    await user.type(
      await screen.findByRole('textbox', { name: 'Company website' }),
      'fernleaf.example',
    );
    await user.selectOptions(screen.getByRole('combobox', { name: 'Industry' }), 'Entertainment');
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Headquarters state' }),
      'Washington (WA)',
    );
    await user.click(screen.getByRole('button', { name: /Next: share your data/ }));
  }

  it('starts with the design defaults and the privacy panel', async () => {
    const { user } = renderAt('/companies/new?name=Fernleaf%20Studio');
    await fillStepOne(user);

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Share your data' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Step 2 of 2')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Role' })).toHaveValue('Account Manager');
    expect(screen.getByRole('combobox', { name: 'State' })).toHaveValue('Washington (WA)');

    const manager = within(
      screen.getByRole('radiogroup', { name: 'Is your direct manager a woman?' }),
    );
    expect(manager.getByRole('radio', { name: 'Yes' })).toHaveAttribute('aria-checked', 'true');
    const serious = within(
      screen.getByRole('radiogroup', {
        name: 'Do you believe your company handles issues seriously?',
      }),
    );
    expect(serious.getByRole('radio', { name: 'Not Sure' })).toHaveAttribute(
      'aria-checked',
      'true',
    );

    expect(screen.getByRole('heading', { name: 'Your data stays private' })).toBeInTheDocument();
  });

  it('saves the company with the answers and opens its page', async () => {
    await signInTestUser();
    const { user } = renderAt('/companies/new?name=Fernleaf%20Studio');
    await fillStepOne(user);

    await user.type(await screen.findByRole('textbox', { name: 'Annual salary (USD)' }), '$98,000');
    await user.type(screen.getByRole('textbox', { name: 'Team size' }), 'N/A');
    await user.click(screen.getByRole('checkbox', { name: 'Women ERG / network' }));
    await user.click(
      screen.getAllByRole('checkbox', { name: 'Skip this section' })[0] as HTMLElement,
    );
    expect(screen.queryByRole('combobox', { name: 'Time to promotion' })).not.toBeInTheDocument();

    const save = screen.getByRole('button', { name: 'Save' });
    await waitFor(() => expect(save).toBeEnabled());
    await user.click(save);

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Fernleaf Studio' }),
    ).toBeInTheDocument();
  });

  it('marks numbers it cannot read and keeps the user on step 2', async () => {
    await signInTestUser();
    const { user } = renderAt('/companies/new?name=Fernleaf%20Studio');
    await fillStepOne(user);

    await user.type(await screen.findByRole('textbox', { name: 'Annual salary (USD)' }), 'lots');
    await user.type(screen.getByRole('textbox', { name: 'Team size' }), '4');
    await user.type(screen.getByRole('textbox', { name: 'Women on team' }), '9');
    const save = screen.getByRole('button', { name: 'Save' });
    await waitFor(() => expect(save).toBeEnabled());
    await user.click(save);

    expect(screen.getByText('Enter a number.')).toBeInTheDocument();
    expect(screen.getByText('Can’t be more than the team size.')).toBeInTheDocument();
    expect(screen.getByText('Step 2 of 2')).toBeInTheDocument();
  });
});
