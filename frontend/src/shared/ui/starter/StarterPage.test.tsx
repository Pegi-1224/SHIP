import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import { StarterPage } from './StarterPage';
import { RelatedLinks } from './RelatedLinks';

describe('StarterPage', () => {
  it('renders the title, the purpose sentence, the fixed replace-me sentence and the source file', () => {
    renderWithProviders(
      <StarterPage
        title="Company Profile"
        description="This page will display company information and workplace metrics."
        sourceFile="src/features/companies/pages/CompanyProfilePage.tsx"
      />,
    );

    expect(screen.getByRole('heading', { name: 'Company Profile' })).toBeInTheDocument();
    expect(
      screen.getByText('This page will display company information and workplace metrics.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Replace this placeholder when the UI design is ready.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('src/features/companies/pages/CompanyProfilePage.tsx'),
    ).toBeInTheDocument();
  });

  it('shows resolved route values, prints "none" for null, and omits undefined ones', () => {
    renderWithProviders(
      <StarterPage
        title="Conversation"
        description="…"
        sourceFile="x.tsx"
        routeValues={{ conversationId: 'conv_42', tag: null, missing: undefined }}
      />,
    );

    expect(screen.getByText('conv_42')).toBeInTheDocument();
    expect(screen.getByText('tag')).toBeInTheDocument();
    expect(screen.getByText('none')).toBeInTheDocument();
    expect(screen.queryByText('missing')).not.toBeInTheDocument();
  });

  it('renders related links as real, working route links', () => {
    renderWithProviders(
      <StarterPage title="Discussions" description="…" sourceFile="x.tsx">
        <RelatedLinks links={[{ to: '/discussions/new', label: 'New post' }]} />
      </StarterPage>,
    );

    const link = screen.getByRole('link', { name: /New post/ });
    expect(link).toHaveAttribute('href', '/discussions/new');
  });
});
