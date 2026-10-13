import { useState } from 'react';
import { Button, Group, Paper, Stack, Text } from '@mantine/core';
import { Check } from 'lucide-react';
import type { Company } from '@/shared/types/company';
import { EmptyState, ErrorState, LoadingState, SearchInput } from '@/shared/ui';
import { useCompanySearch } from '../hooks/useCompanies';
import styles from './CompanyPicker.module.css';

export interface CompanyPickerProps {
  label: string;
  placeholder?: string;
  /** Companies already chosen, so they can be marked as selected. */
  selectedIds?: string[];
  onSelect: (company: Company) => void;
  /** Hidden from results, e.g. the company already on the other side of a comparison. */
  excludeIds?: string[];
  emptyHint?: string;
}

/**
 * Search-and-choose control.
 *
 * Used by the comparison page to pick the second company and by assessment
 * question 5 to follow companies. It handles its own loading, error and
 * no-results states so callers do not repeat them.
 */
export function CompanyPicker({
  label,
  placeholder = 'Search a company',
  selectedIds = [],
  onSelect,
  excludeIds = [],
  emptyHint,
}: CompanyPickerProps) {
  const [query, setQuery] = useState('');
  const search = useCompanySearch({ q: query, pageSize: 6 }, query.trim().length > 0);

  const results = (search.data?.items ?? []).filter((company) => !excludeIds.includes(company.id));

  return (
    <Stack gap="sm">
      <SearchInput
        label={label}
        placeholder={placeholder}
        onSearch={setQuery}
        onChange={(value) => {
          // Clearing the box should clear the results, not keep stale ones.
          if (value.trim().length === 0) setQuery('');
        }}
        size="sm"
      />

      {query.trim().length === 0 ? (
        emptyHint ? (
          <Text size="sm" c="dimmed">
            {emptyHint}
          </Text>
        ) : null
      ) : search.isPending ? (
        <LoadingState variant="inline" label="Searching…" />
      ) : search.isError ? (
        <ErrorState
          error={search.error}
          onRetry={() => void search.refetch()}
          isRetrying={search.isFetching}
        />
      ) : results.length === 0 ? (
        <EmptyState
          title="No matches"
          description={`We do not have a company matching "${query}" yet.`}
        />
      ) : (
        <Stack gap="xs">
          {results.map((company) => {
            const selected = selectedIds.includes(company.id);
            return (
              <Paper key={company.id} withBorder p="sm" className={styles.row}>
                <Group justify="space-between" wrap="nowrap" gap="sm">
                  <div className={styles.info}>
                    <Text size="sm" fw={600}>
                      {company.name}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {company.industry} · {company.headquartersCity}
                    </Text>
                  </div>
                  <Button
                    size="xs"
                    variant={selected ? 'light' : 'filled'}
                    onClick={() => onSelect(company)}
                    leftSection={selected ? <Check size={14} aria-hidden="true" /> : undefined}
                  >
                    {selected ? 'Selected' : 'Select'}
                  </Button>
                </Group>
              </Paper>
            );
          })}
        </Stack>
      )}
    </Stack>
  );
}
