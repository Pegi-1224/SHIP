import { Stack, Text } from '@mantine/core';
import { QueryStateView } from '@/shared/ui';
import { useDemoCompanySearch } from '../hooks/useCompanies';
import { CompanyRecordCard } from './CompanyRecordCard';

export interface CompanyDemoResultsProps {
  /** What the user typed in the header's company search (the `q` URL value). */
  query: string;
}

/**
 * Companies similar to `query`, best match first; every company when it is
 * empty. Data comes from `GET /demo/companies?q=`, served from
 * `src/mocks/data/companies.json`.
 */
export function CompanyDemoResults({ query }: CompanyDemoResultsProps) {
  const q = query.trim();
  const search = useDemoCompanySearch(q);

  return (
    <QueryStateView
      query={search}
      loadingLabel="Searching companies…"
      isEmpty={(data) => data.items.length === 0}
      emptyProps={{
        title: 'No similar companies',
        description: `Nothing in the demo data is similar to "${q}".`,
      }}
    >
      {(data) => (
        <Stack gap="sm" aria-live="polite">
          <Text size="sm" c="dimmed">
            {q
              ? `${data.total} ${data.total === 1 ? 'company' : 'companies'} similar to "${q}"`
              : `All ${data.total} demo companies`}
          </Text>
          {data.items.map((hit) => (
            <CompanyRecordCard key={hit.item.id} company={hit.item} score={hit.score} />
          ))}
        </Stack>
      )}
    </QueryStateView>
  );
}
