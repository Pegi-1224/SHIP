import { useSearchParams } from 'react-router-dom';
import { paths } from '@/shared/config/paths';
import { RelatedLinks, StarterPage } from '@/shared/ui';

/**
 * Side-by-side company comparison (`/compare`).
 *
 * Reusable, already-wired building blocks for the real design:
 *   - `src/features/companies/utils/comparison.ts` - `buildComparison` and
 *     the five per-metric comparison functions. Pure, unit-tested (23 cases),
 *     untouched by this refactor - import it directly
 *   - `src/features/companies/components/ComparisonMetric.tsx` - renders one
 *     metric's sentence, chart and text-equivalent table
 *   - `src/features/companies/components/CompanyPicker.tsx` - search-and-pick
 *     control for choosing the two companies
 *   - `src/features/companies/hooks/useCompanies.ts` - `useComparison`
 */
export function ComparePage() {
  const [searchParams] = useSearchParams();

  return (
    <StarterPage
      title="Compare Companies"
      description="This page will show a side-by-side comparison of two companies with a generated summary."
      sourceFile="src/features/companies/pages/ComparePage.tsx"
      routeValues={{ a: searchParams.get('a'), b: searchParams.get('b') }}
    >
      <RelatedLinks
        links={[
          {
            to: paths.compareCompanies('northwind-systems', 'harborline-financial'),
            label: 'Example comparison',
          },
          { to: paths.companies(), label: 'Company search' },
        ]}
      />
    </StarterPage>
  );
}
