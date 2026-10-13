import { useParams } from 'react-router-dom';
import { paths } from '@/shared/config/paths';
import { RelatedLinks, StarterPage } from '@/shared/ui';

/**
 * Create or edit a company-data submission (`/companies/:companyId/submit`).
 *
 * Reusable, already-wired building blocks for the real design:
 *   - `src/features/companies/schemas/submissionSchema.ts` - validation for
 *     "any subset of sections, each complete if chosen", plus
 *     `toSubmissionSections` / `fromSubmissionSections` for the API shape
 *   - `src/features/companies/hooks/useCompanies.ts` -
 *     `useSubmissionEligibility` (new-vs-edit + the 90-day window),
 *     `useSubmitCompanyData`
 *   - `src/shared/config/formOptions.ts` - role, level and city option lists
 */
export function CompanySubmitPage() {
  const { companyId } = useParams<{ companyId: string }>();

  return (
    <StarterPage
      title="Company Data Submission"
      description="This page will provide a form for submitting or editing workplace data about a specific company."
      sourceFile="src/features/companies/pages/CompanySubmitPage.tsx"
      routeValues={{ companyId }}
    >
      <RelatedLinks
        links={[{ to: paths.companyDetail(companyId ?? ''), label: 'Back to this company' }]}
      />
    </StarterPage>
  );
}
