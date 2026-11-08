import { Stack, Text, Title } from '@mantine/core';
import { QueryStateView } from '@/shared/ui';
import { useDemoCompanySearch } from '../hooks/useCompanies';
import { CompanyNotFound } from './CompanyNotFound';
import { CompanyRecordCard } from './CompanyRecordCard';

export interface CompanyDemoResultsProps {
  /** What the user typed in the header's company search (the `q` URL value). */
  query: string;
}

/**
 * Companies similar to `query`, best match first; every company when it is
 * empty. When nothing is similar, offers to add the company instead
 * (`CompanyNotFound`). Data comes from `GET /demo/companies?q=`, served from
 * `src/mocks/data/companies.json`.
 */
export function CompanyDemoResults({ query }: CompanyDemoResultsProps) {
  const q = query.trim();
  const search = useDemoCompanySearch(q);

  return (
    <QueryStateView query={search} loadingLabel="Searching companies…">
      {(data) =>
        data.items.length === 0 && q ? (
          <CompanyNotFound name={q} />
        ) : (
          <Stack component="section" gap="sm" maw={760} aria-labelledby="company-results-title">
            <Title order={2} size="var(--ship-text-xl)" id="company-results-title">
              Companies
            </Title>
            <Text size="sm" c="dimmed" aria-live="polite">
              {q
                ? `${data.total} ${data.total === 1 ? 'company' : 'companies'} similar to "${q}"`
                : `All ${data.total} demo companies`}
            </Text>
            {data.items.map((hit) => (
              <CompanyRecordCard key={hit.item.id} company={hit.item} score={hit.score} />
            ))}
          </Stack>
        )
      }
    </QueryStateView>
  );
}
