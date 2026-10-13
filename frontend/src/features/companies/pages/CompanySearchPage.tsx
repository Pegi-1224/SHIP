import { useSearchParams } from 'react-router-dom';
import { paths } from '@/shared/config/paths';
import { RelatedLinks, StarterPage } from '@/shared/ui';

/**
 * Company search results (`/companies`).
 *
 * Reusable, already-wired building blocks for the real design:
 *   - `src/shared/ui` - `SearchInput`, `CompanyCard`
 *   - `src/features/companies/hooks/useCompanies.ts` - `useCompanySearch`
 *   - `src/features/companies/api/companiesApi.ts` - `searchCompanies`
 */
export function CompanySearchPage() {
  const [searchParams] = useSearchParams();

  return (
    <StarterPage
      title="Company Search"
      description="This page will let users search for companies and browse results."
      sourceFile="src/features/companies/pages/CompanySearchPage.tsx"
      routeValues={{ q: searchParams.get('q') }}
    >
      <RelatedLinks
        links={[
          { to: paths.companyNew(), label: 'Add a company' },
          { to: paths.companyDetail('northwind-systems'), label: 'Company profile (example)' },
          { to: paths.compareCompanies('northwind-systems', 'harborline-financial'), label: 'Compare (example)' },
          { to: paths.home(), label: 'Home' },
        ]}
      />
    </StarterPage>
  );
}
