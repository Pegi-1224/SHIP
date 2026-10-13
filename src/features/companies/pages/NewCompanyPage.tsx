import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Group, Paper, Select, Stack, Text, TextInput } from '@mantine/core';
import { AlertTriangle } from 'lucide-react';
import { z } from 'zod';
import { INDUSTRIES } from '@/shared/types/common';
import { US_CITY_OPTIONS } from '@/shared/config/formOptions';
import { paths } from '@/shared/config/paths';
import { CompanyCard, FormErrorAlert, PageHeader, SubmitButton, notifySuccess } from '@/shared/ui';
import { useCreateCompany, useSimilarCompanies } from '../hooks/useCompanies';
import styles from './NewCompanyPage.module.css';

const newCompanySchema = z.object({
  name: z.string().trim().min(2, 'Enter the company name.'),
  website: z
    .string()
    .trim()
    .min(1, 'Enter the company website.')
    .pipe(z.url('Enter a full address, including https://')),
  industry: z.enum(INDUSTRIES, { message: 'Choose an industry.' }),
  headquartersCity: z.string().min(1, 'Choose a city.'),
});

type NewCompanyValues = z.infer<typeof newCompanySchema>;

/**
 * Add a company that is not in the database yet (spec 6.4, 6.5).
 *
 * While the name is being typed, similar existing companies are suggested so
 * "Northwind" and "Northwind Systems Inc." do not both end up in the database.
 * The suggestions are advisory; the server rejects an actual duplicate by
 * website, which is the reliable key.
 */
export function NewCompanyPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const createCompany = useCreateCompany();
  const [nameDraft, setNameDraft] = useState(searchParams.get('name') ?? '');

  const suggestions = useSimilarCompanies(nameDraft);

  const form = useForm<NewCompanyValues>({
    resolver: zodResolver(newCompanySchema),
    defaultValues: {
      name: searchParams.get('name') ?? '',
      website: '',
      industry: 'Tech',
      headquartersCity: '',
    },
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      const company = await createCompany.mutateAsync(values);
      notifySuccess(`${company.name} was added. You can share your data now.`);
      // Straight on to the submission form, which is why the user came here.
      navigate(paths.companySubmit(company.id));
    } catch {
      // Errors show inline. Everything typed stays in the form (spec 5.5).
    }
  });

  return (
    <Stack gap="lg" className={styles.page}>
      <PageHeader
        title="Add a company"
        description="Add a company we do not have yet, then be the first to share data about it."
      />

      <Alert color="ship" variant="light" role="note">
        <Text size="sm">
          This demo stores companies in an in-browser mock database. Please add fictional companies
          only.
        </Text>
      </Alert>

      <form onSubmit={handleSubmit} noValidate>
        <Stack gap="md">
          <TextInput
            {...form.register('name', {
              onChange: (event) => setNameDraft(event.currentTarget.value),
            })}
            label="Company name"
            placeholder="Northwind Systems"
            error={form.formState.errors.name?.message}
            required
          />

          {suggestions.data && suggestions.data.length > 0 ? (
            <Paper withBorder p="md" className={styles.suggestions}>
              <Group gap="xs" mb="sm">
                <AlertTriangle size={16} aria-hidden="true" />
                <Text size="sm" fw={600}>
                  We already have something similar
                </Text>
              </Group>
              <Text size="xs" c="dimmed" mb="sm">
                If one of these is the same employer, open it instead of adding a duplicate.
              </Text>
              <Stack gap="xs">
                {suggestions.data.map((suggestion) => (
                  <CompanyCard
                    key={suggestion.company.id}
                    company={suggestion.company}
                    action={{
                      label: 'This one',
                      onClick: () => navigate(paths.companyDetail(suggestion.company.id)),
                    }}
                  />
                ))}
              </Stack>
            </Paper>
          ) : null}

          <TextInput
            {...form.register('website')}
            label="Company website"
            description="We use the website to tell companies apart, so two records cannot share one."
            placeholder="https://northwind-systems.example"
            error={form.formState.errors.website?.message}
            required
          />

          <Controller
            control={form.control}
            name="industry"
            render={({ field }) => (
              <Select
                {...field}
                label="Industry"
                data={[...INDUSTRIES]}
                error={form.formState.errors.industry?.message}
                required
              />
            )}
          />

          <Controller
            control={form.control}
            name="headquartersCity"
            render={({ field }) => (
              <Select
                {...field}
                label="Headquarters city"
                data={[...US_CITY_OPTIONS]}
                placeholder="Choose a city"
                searchable
                error={form.formState.errors.headquartersCity?.message}
                required
              />
            )}
          />

          <FormErrorAlert
            error={createCompany.error}
            onRetry={() => void handleSubmit()}
            isRetrying={createCompany.isPending}
          />

          <Group justify="flex-end">
            <SubmitButton isPending={createCompany.isPending} pendingLabel="Adding…">
              Add company
            </SubmitButton>
          </Group>
        </Stack>
      </form>
    </Stack>
  );
}
