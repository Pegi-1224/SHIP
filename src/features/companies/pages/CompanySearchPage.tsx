import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button, Stack, Text } from '@mantine/core';
import { Plus } from 'lucide-react';
import { paths } from '@/shared/config/paths';
import {
  CompanyCard,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  SearchInput,
} from '@/shared/ui';
import { formatCount } from '@/shared/utils/format';
import { useCompanySearch } from '../hooks/useCompanies';

/**
 * Company search results (spec 3.5, 6.5).
 *
 * The query lives in the URL, so a search can be shared, bookmarked and
 * restored by the Back button. When nothing matches, the empty state offers
 * "Add this company" with the typed name carried across.
 */
export function CompanySearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get('q')?.trim() ?? '';

  const search = useCompanySearch({ q: query });

  const runSearch = (next: string) => {
    setSearchParams(next ? { q: next } : {}, { replace: false });
  };

  return (
    <Stack gap="lg">
      <PageHeader
        title="Companies"
        description="Search a company to see what the SHIP team found in published sources and what employees reported."
        action={
          <Button
            variant="light"
            leftSection={<Plus size={16} aria-hidden="true" />}
            onClick={() => navigate(paths.companyNewWithName(query))}
          >
            Add a company
          </Button>
        }
      />

      <SearchInput
        label="Search companies"
        placeholder="Try Northwind Systems"
        defaultValue={query}
        onSearch={runSearch}
        autoFocus={query.length === 0}
      />

      {query.length === 0 ? (
        <EmptyState
          title="Search for a company"
          description="Type a company name above. All companies in this demo are fictional."
        />
      ) : search.isPending ? (
        <LoadingState label="Searching companies…" />
      ) : search.isError ? (
        <ErrorState
          error={search.error}
          onRetry={() => void search.refetch()}
          isRetrying={search.isFetching}
        />
      ) : search.data.items.length === 0 ? (
        <EmptyState
          title="We don't have this company yet."
          description={`Nothing matches "${query}". You can add it and be the first to share data.`}
          action={{
            label: 'Add this company',
            onClick: () => navigate(paths.companyNewWithName(query)),
          }}
        />
      ) : (
        <Stack gap="sm">
          <Text size="sm" c="dimmed" role="status">
            {formatCount(search.data.total, 'company', 'companies')} found
          </Text>
          {search.data.items.map((company) => (
            <CompanyCard key={company.id} company={company} />
          ))}
        </Stack>
      )}
    </Stack>
  );
}
