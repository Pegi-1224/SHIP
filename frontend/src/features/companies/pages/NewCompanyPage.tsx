import { paths } from '@/shared/config/paths';
import { RelatedLinks, StarterPage } from '@/shared/ui';

/**
 * Add a company (`/companies/new`).
 *
 * Reusable, already-wired building blocks for the real design:
 *   - `src/features/companies/hooks/useCompanies.ts` - `useCreateCompany`,
 *     `useSimilarCompanies` (near-duplicate suggestions while typing)
 *   - `src/features/companies/api/companiesApi.ts` - `createCompany`,
 *     `fetchSimilarCompanies`
 *   - `src/shared/config/formOptions.ts` - industry and city option lists
 */
export function NewCompanyPage() {
  return (
    <StarterPage
      title="Add Company"
      description="This page will provide a form to add a company that is not yet in the database."
      sourceFile="src/features/companies/pages/NewCompanyPage.tsx"
    >
      <RelatedLinks links={[{ to: paths.companies(), label: 'Company search' }]} />
    </StarterPage>
  );
}
