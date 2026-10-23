import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Badge, Group } from '@mantine/core';
import { QueryStateView } from '@/shared/ui';
import { formatHostname } from '@/shared/utils/format';
import { useDemoCompany } from '../hooks/useCompanies';
import { CompanyDetails } from '../components/profile/CompanyDetails';
import { formatDay } from '../components/profile/format';
import {
  BenefitsBox,
  DiversityBox,
  MaternityBox,
  PromotionBox,
  SalaryBox,
} from '../components/profile/MetricBoxes';
import { ReportModal } from '../components/profile/ReportModal';
import { VerificationBadge } from '../components/profile/VerificationBadge';
import styles from '../components/profile/profile.module.css';
import type { DemoReportArea } from '@/shared/utils/demoReports';

/**
 * A single company's page (`/companies/:companyId`), reached from the Home
 * company search.
 *
 * Data: `GET /demo/companies/:companyId`, served from
 * `src/mocks/data/companies.json` (see docs/demo-search.md).
 *
 * Layout: overview, then the five metric boxes (salary, promotion &
 * leadership, women support & diversity; paid maternity leave and welfare
 * benefits below them), then contact details and sources. Each box's
 * "Be the first" / "Add yours" button opens the report form, and accepted
 * reports are written back into companies.json on the dev server.
 */
export function CompanyProfilePage() {
  const { companyId } = useParams<{ companyId: string }>();
  const company = useDemoCompany(companyId);
  const [reportArea, setReportArea] = useState<DemoReportArea | null>(null);

  return (
    <div className={styles.page}>
      <QueryStateView
        query={company}
        loadingLabel="Loading company…"
        errorTitle="Company not found"
      >
        {(data) => (
          <>
            <header className={styles.overview}>
              <Group gap="sm" wrap="wrap" align="center">
                <h1 className={styles.companyName}>{data.name}</h1>
                <VerificationBadge status={data.verification.status} />
              </Group>
              <span className={styles.overviewMeta}>
                {data.location} ·{' '}
                <a href={data.website} target="_blank" rel="noreferrer">
                  {formatHostname(data.website)}
                </a>{' '}
                · Data collected {formatDay(data.dataCollectedAt)}
              </span>
              <Group gap={6} wrap="wrap">
                {data.mainFocus.map((focus) => (
                  <Badge key={focus} size="sm" variant="outline" color="gray">
                    {focus}
                  </Badge>
                ))}
              </Group>
              <p className={styles.intro}>{data.intro}</p>
            </header>

            <div className={styles.grid}>
              <SalaryBox company={data} onReport={setReportArea} />
              <PromotionBox company={data} onReport={setReportArea} />
              <DiversityBox company={data} onReport={setReportArea} />
              <MaternityBox company={data} onReport={setReportArea} />
              <BenefitsBox company={data} onReport={setReportArea} />
            </div>

            <CompanyDetails company={data} />
            <ReportModal company={data} area={reportArea} onClose={() => setReportArea(null)} />
          </>
        )}
      </QueryStateView>
    </div>
  );
}
