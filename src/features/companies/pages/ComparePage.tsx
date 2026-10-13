import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, Button, Collapse, Group, Paper, Stack, Text, Title } from '@mantine/core';
import { ArrowLeftRight, Info } from 'lucide-react';
import type { Company } from '@/shared/types/company';
import { EmptyState, ErrorState, LoadingState, PageHeader } from '@/shared/ui';
import { CompanyPicker } from '../components/CompanyPicker';
import { ComparisonMetric } from '../components/ComparisonMetric';
import {
  BenefitsMetric,
  DiversityMetric,
  MaternityMetric,
  PromotionMetric,
  SalaryMetric,
} from '../components/metrics/CompanyMetrics';
import { useComparison } from '../hooks/useCompanies';
import { buildComparison } from '../utils/comparison';
import styles from './ComparePage.module.css';

/**
 * Side-by-side company comparison (spec 3.5, 6.3, AC-4).
 *
 * The two company ids live in the URL (`/compare?a=…&b=…`) so a comparison can
 * be shared and restored. The summary is generated from the same payload the
 * page renders, so the sentences and the numbers can never disagree.
 */
export function ComparePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showFullData, setShowFullData] = useState(false);

  const idA = searchParams.get('a');
  const idB = searchParams.get('b');

  const comparisonQuery = useComparison(idA, idB);

  const result = useMemo(
    () => (comparisonQuery.data ? buildComparison(comparisonQuery.data.a, comparisonQuery.data.b) : null),
    [comparisonQuery.data],
  );

  const setSide = (side: 'a' | 'b', company: Company) => {
    const next = new URLSearchParams(searchParams);
    next.set(side, company.id);
    setSearchParams(next);
  };

  return (
    <Stack gap="lg">
      <PageHeader
        title="Compare two companies"
        description="We only compare figures that measure the same thing over the same group and period. Where that is not possible, we say so instead of guessing."
      />

      <Paper withBorder p="lg">
        <div className={styles.pickers}>
          <CompanyPicker
            label="First company"
            selectedIds={idA ? [idA] : []}
            excludeIds={idB ? [idB] : []}
            onSelect={(company) => setSide('a', company)}
            emptyHint={
              comparisonQuery.data
                ? `Currently: ${comparisonQuery.data.a.company.name}`
                : 'Search to choose the first company.'
            }
          />

          <div className={styles.versus} aria-hidden="true">
            VS
          </div>

          <CompanyPicker
            label="Second company"
            selectedIds={idB ? [idB] : []}
            excludeIds={idA ? [idA] : []}
            onSelect={(company) => setSide('b', company)}
            emptyHint={
              comparisonQuery.data
                ? `Currently: ${comparisonQuery.data.b.company.name}`
                : 'Search to choose the second company.'
            }
          />
        </div>
      </Paper>

      {!idA || !idB ? (
        <EmptyState
          title="Choose two companies"
          description="Pick a company on each side to see the comparison and the generated summary."
          icon={<ArrowLeftRight size={28} aria-hidden="true" />}
        />
      ) : comparisonQuery.isPending ? (
        <LoadingState label="Comparing…" />
      ) : comparisonQuery.isError ? (
        <ErrorState
          error={comparisonQuery.error}
          title="We could not build this comparison"
          onRetry={() => void comparisonQuery.refetch()}
          isRetrying={comparisonQuery.isFetching}
        />
      ) : result ? (
        <Stack gap="lg">
          <Paper withBorder p="lg">
            <Stack gap="sm">
              <Title order={2} size="var(--ship-text-xl)">
                Summary
              </Title>
              <Text size="xs" c="dimmed">
                Generated from the figures on this page by a fixed set of rules. No model or
                prediction is involved.
              </Text>

              <Stack gap={2}>
                {result.metrics.map((metric) => (
                  <div key={metric.area} className={styles.summarySentence}>
                    <span
                      aria-hidden="true"
                      className={`${styles.statusDot} ${
                        metric.status === 'a_leads'
                          ? styles.dotA
                          : metric.status === 'b_leads'
                            ? styles.dotB
                            : styles.dotNeutral
                      }`}
                    />
                    <Text size="sm">{metric.sentence}</Text>
                  </div>
                ))}
              </Stack>

              <Text size="sm" fw={600} mt="xs">
                {result.closingSentence}
              </Text>
            </Stack>
          </Paper>

          {result.metrics.some((metric) => metric.status === 'not_comparable') ? (
            <Alert
              color="orange"
              variant="light"
              icon={<Info size={18} aria-hidden="true" />}
              title="Some figures could not be compared"
              role="note"
            >
              <Text size="sm">
                Two numbers are only comparable when they measure the same thing, over the same
                group of people, for the same period. Where that was not true we show both figures
                and explain the difference rather than declaring a winner.
              </Text>
            </Alert>
          ) : null}

          <Stack gap="md">
            {result.metrics.map((metric) => (
              <ComparisonMetric
                key={metric.area}
                comparison={metric}
                companyAName={comparisonQuery.data.a.company.name}
                companyBName={comparisonQuery.data.b.company.name}
              />
            ))}
          </Stack>

          <div>
            <Button
              variant="light"
              onClick={() => setShowFullData((open) => !open)}
              aria-expanded={showFullData}
            >
              {showFullData ? 'Hide full company data' : 'Show full data for both companies'}
            </Button>

            <Collapse expanded={showFullData}>
              <div className={styles.columns} style={{ marginTop: 'var(--ship-space-4)' }}>
                <Stack gap="md">
                  <Title order={2} size="var(--ship-text-lg)">
                    {comparisonQuery.data.a.company.name}
                  </Title>
                  <SalaryMetric profile={comparisonQuery.data.a} />
                  <PromotionMetric profile={comparisonQuery.data.a} />
                  <DiversityMetric profile={comparisonQuery.data.a} />
                  <BenefitsMetric profile={comparisonQuery.data.a} />
                  <MaternityMetric profile={comparisonQuery.data.a} />
                </Stack>
                <Stack gap="md">
                  <Title order={2} size="var(--ship-text-lg)">
                    {comparisonQuery.data.b.company.name}
                  </Title>
                  <SalaryMetric profile={comparisonQuery.data.b} />
                  <PromotionMetric profile={comparisonQuery.data.b} />
                  <DiversityMetric profile={comparisonQuery.data.b} />
                  <BenefitsMetric profile={comparisonQuery.data.b} />
                  <MaternityMetric profile={comparisonQuery.data.b} />
                </Stack>
              </div>
            </Collapse>
          </div>

          <Group gap="xs" justify="center">
            <Text size="xs" c="dimmed" ta="center">
              Both companies shown here are fictional demonstration records.
            </Text>
          </Group>
        </Stack>
      ) : null}
    </Stack>
  );
}
