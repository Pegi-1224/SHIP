import { useParams } from 'react-router-dom';
import { paths } from '@/shared/config/paths';
import { RelatedLinks, StarterPage } from '@/shared/ui';

/**
 * A single company's profile (`/companies/:companyId`).
 *
 * Reusable, already-wired building blocks for the real design:
 *   - `src/features/companies/components/metrics/CompanyMetrics.tsx` - the
 *     five metric-area renderers (salary, promotion, diversity, benefits,
 *     maternity), each already split into Public Data and User Reported
 *   - `src/shared/ui` - `MetricCard`, `SourceLabel`, `DataPoint`,
 *     `MissingDataNotice`, `ThresholdNotice` (the privacy-threshold copy)
 *   - `src/features/companies/hooks/useCompanies.ts` - `useCompanyProfile`
 *
 * This starter page does not fetch the company - see
 * `docs/feature-checklist.md` for what is implemented versus pending.
 */
export function CompanyProfilePage() {
  const { companyId } = useParams<{ companyId: string }>();

  return (
    <StarterPage
      title="Company Profile"
      description="This page will display company information and workplace metrics, separated into public data and user-reported data."
      sourceFile="src/features/companies/pages/CompanyProfilePage.tsx"
      routeValues={{ companyId }}
    >
      <RelatedLinks
        links={[
          { to: paths.companySubmit(companyId ?? ''), label: 'Submit data for this company' },
          { to: paths.compareCompanies(companyId ?? '', 'harborline-financial'), label: 'Compare this company' },
          { to: paths.companies(), label: 'Back to company search' },
        ]}
      />
    </StarterPage>
  );
}
