import { useEffect, type ReactNode } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Anchor,
  Checkbox,
  Group,
  MultiSelect,
  NumberInput,
  Paper,
  Radio,
  Select,
  Stack,
  Switch,
  Text,
  Title,
} from '@mantine/core';
import { ArrowLeft, Info } from 'lucide-react';
import {
  BENEFIT_LABELS,
  BENEFIT_OPTIONS,
  METRIC_AREA_LABELS,
  SUPPORT_PROGRAMS,
  SUPPORT_PROGRAM_LABELS,
  type MetricAreaId,
} from '@/shared/types/company';
import { SENIORITY_LEVELS } from '@/shared/types/common';
import { ROLE_OPTIONS, US_CITY_OPTIONS } from '@/shared/config/formOptions';
import { paths } from '@/shared/config/paths';
import { SUBMISSION_WINDOW_DAYS } from '@/shared/config/constants';
import { ErrorState, FormErrorAlert, LoadingState, PageHeader, SubmitButton, notifySuccess } from '@/shared/ui';
import { formatDate } from '@/shared/utils/format';
import { useCompanyProfile, useSubmissionEligibility, useSubmitCompanyData } from '../hooks/useCompanies';
import {
  emptySubmissionForm,
  fromSubmissionSections,
  submissionFormSchema,
  toSubmissionSections,
  type SubmissionFormValues,
} from '../schemas/submissionSchema';
import styles from './CompanySubmitPage.module.css';

const YES_NO = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
];

const TRUST_OPTIONS = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
  { value: 'not_sure', label: 'Not sure' },
];

/**
 * Create or edit a company-data submission (spec 6.4, 6.5, AC-7).
 *
 * The server decides whether this is a create or an edit: if the user already
 * submitted inside the rolling 90-day window, the form loads their existing
 * answers and saves over them instead of adding a second record. The window
 * runs from the first submission and editing never restarts it.
 */
export function CompanySubmitPage() {
  const { companyId } = useParams<{ companyId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const requestedArea = searchParams.get('area') as MetricAreaId | null;

  const profileQuery = useCompanyProfile(companyId);
  const eligibilityQuery = useSubmissionEligibility(companyId);
  const submit = useSubmitCompanyData(companyId ?? '');

  const form = useForm<SubmissionFormValues>({
    resolver: zodResolver(submissionFormSchema),
    defaultValues: emptySubmissionForm,
  });

  const { reset } = form;

  // useWatch rather than form.watch(): it is the subscription API and is safe
  // to memoize, which keeps the React Compiler lint rules happy.
  const enabled = useWatch({ control: form.control, name: 'enabled' });

  // Load the existing submission for editing, and pre-open the requested
  // section when the user arrived from a "Share your data" button.
  useEffect(() => {
    const eligibility = eligibilityQuery.data;
    if (!eligibility) return;

    const base = eligibility.existingSubmission
      ? fromSubmissionSections(eligibility.existingSubmission.sections)
      : emptySubmissionForm;

    reset(
      requestedArea
        ? { ...base, enabled: { ...base.enabled, [requestedArea]: true } }
        : base,
    );
  }, [eligibilityQuery.data, requestedArea, reset]);

  if (profileQuery.isPending || eligibilityQuery.isPending) {
    return <LoadingState label="Loading the form…" />;
  }

  if (profileQuery.isError) {
    return (
      <ErrorState
        error={profileQuery.error}
        onRetry={() => void profileQuery.refetch()}
        isRetrying={profileQuery.isFetching}
      />
    );
  }

  if (eligibilityQuery.isError) {
    return (
      <ErrorState
        error={eligibilityQuery.error}
        onRetry={() => void eligibilityQuery.refetch()}
        isRetrying={eligibilityQuery.isFetching}
      />
    );
  }

  const company = profileQuery.data.company;
  const eligibility = eligibilityQuery.data;
  const isEditing = Boolean(eligibility.existingSubmission);
  const errors = form.formState.errors;

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      await submit.mutateAsync({
        sections: toSubmissionSections(values),
        submissionId: eligibility.existingSubmission?.id,
      });
      notifySuccess(
        isEditing ? 'Your submission was updated.' : 'Thank you for sharing your data.',
      );
      navigate(paths.companyDetail(company.id));
    } catch {
      // Errors render inline below; the form keeps everything typed (spec 5.5).
    }
  });

  return (
    <Stack gap="lg" className={styles.page}>
      <Anchor component={Link} to={paths.companyDetail(company.id)} size="sm">
        <Group gap={4} component="span">
          <ArrowLeft size={14} aria-hidden="true" />
          Back to {company.name}
        </Group>
      </Anchor>

      <PageHeader
        title={isEditing ? `Edit your data for ${company.name}` : `Share your data for ${company.name}`}
        description="Fill in only the sections you want to. Everything you enter is pooled with other people's answers and only shown as an average once five people have contributed."
      />

      {isEditing ? (
        <Alert
          color="ship"
          variant="light"
          icon={<Info size={18} aria-hidden="true" />}
          title="You are editing your existing submission"
          role="note"
        >
          <Text size="sm">
            You shared data for {company.name} on {formatDate(eligibility.existingSubmission?.createdAt)}
            . One submission per company per {SUBMISSION_WINDOW_DAYS} days, so this updates that one
            rather than adding another.
            {eligibility.nextSubmissionAllowedAt
              ? ` You can start a fresh submission from ${formatDate(eligibility.nextSubmissionAllowedAt)}.`
              : ''}
          </Text>
        </Alert>
      ) : null}

      <form onSubmit={handleSubmit} noValidate>
        <Stack gap="md">
          {errors.enabled?.message ? (
            <Text size="sm" c="var(--ship-color-danger)" role="alert">
              {errors.enabled.message}
            </Text>
          ) : null}

          {/* ---------------- Salary ---------------- */}
          <Section
            area="salary"
            enabled={enabled.salary}
            onToggle={(value) => form.setValue('enabled.salary', value)}
          >
            <Stack gap="sm">
              <Controller
                control={form.control}
                name="salary.role"
                render={({ field }) => (
                  <Select
                    {...field}
                    label="Role"
                    data={[...ROLE_OPTIONS]}
                    placeholder="Choose a role"
                    error={errors.salary?.role?.message}
                    searchable
                  />
                )}
              />
              <Controller
                control={form.control}
                name="salary.level"
                render={({ field }) => (
                  <Select
                    {...field}
                    label="Level"
                    data={[...SENIORITY_LEVELS]}
                    placeholder="Choose a level"
                    error={errors.salary?.level?.message}
                  />
                )}
              />
              <Controller
                control={form.control}
                name="salary.city"
                render={({ field }) => (
                  <Select
                    {...field}
                    label="City"
                    data={[...US_CITY_OPTIONS]}
                    placeholder="Choose a city"
                    error={errors.salary?.city?.message}
                    searchable
                  />
                )}
              />
              <Controller
                control={form.control}
                name="salary.annualSalaryUsd"
                render={({ field }) => (
                  <NumberInput
                    {...field}
                    label="Annual base salary (USD)"
                    description="Base salary only, before bonus or equity."
                    placeholder="150000"
                    min={0}
                    thousandSeparator=","
                    prefix="$"
                    error={errors.salary?.annualSalaryUsd?.message}
                  />
                )}
              />
            </Stack>
          </Section>

          {/* ---------------- Promotion ---------------- */}
          <Section
            area="promotion"
            enabled={enabled.promotion}
            onToggle={(value) => form.setValue('enabled.promotion', value)}
          >
            <Stack gap="sm">
              <Controller
                control={form.control}
                name="promotion.role"
                render={({ field }) => (
                  <Select
                    {...field}
                    label="Role"
                    data={[...ROLE_OPTIONS]}
                    placeholder="Choose a role"
                    error={errors.promotion?.role?.message}
                    searchable
                  />
                )}
              />
              <Group grow align="flex-start">
                <Controller
                  control={form.control}
                  name="promotion.fromLevel"
                  render={({ field }) => (
                    <Select
                      {...field}
                      label="Level before promotion"
                      data={[...SENIORITY_LEVELS]}
                      placeholder="Choose"
                      error={errors.promotion?.fromLevel?.message}
                    />
                  )}
                />
                <Controller
                  control={form.control}
                  name="promotion.toLevel"
                  render={({ field }) => (
                    <Select
                      {...field}
                      label="Level after promotion"
                      data={[...SENIORITY_LEVELS]}
                      placeholder="Choose"
                      error={errors.promotion?.toLevel?.message}
                    />
                  )}
                />
              </Group>
              <Controller
                control={form.control}
                name="promotion.monthsToPromotion"
                render={({ field }) => (
                  <NumberInput
                    {...field}
                    label="Months it took"
                    placeholder="24"
                    min={1}
                    allowDecimal={false}
                    error={errors.promotion?.monthsToPromotion?.message}
                  />
                )}
              />
            </Stack>
          </Section>

          {/* ---------------- Diversity ---------------- */}
          <Section
            area="diversity"
            enabled={enabled.diversity}
            onToggle={(value) => form.setValue('enabled.diversity', value)}
          >
            <Stack gap="sm">
              <Group grow align="flex-start">
                <Controller
                  control={form.control}
                  name="diversity.teamSize"
                  render={({ field }) => (
                    <NumberInput
                      {...field}
                      label="People on your immediate team"
                      placeholder="12"
                      min={1}
                      allowDecimal={false}
                      error={errors.diversity?.teamSize?.message}
                    />
                  )}
                />
                <Controller
                  control={form.control}
                  name="diversity.womenOnTeam"
                  render={({ field }) => (
                    <NumberInput
                      {...field}
                      label="Of those, how many are women"
                      placeholder="5"
                      min={0}
                      allowDecimal={false}
                      error={errors.diversity?.womenOnTeam?.message}
                    />
                  )}
                />
              </Group>

              <Controller
                control={form.control}
                name="diversity.managerIsWoman"
                render={({ field }) => (
                  <Radio.Group
                    {...field}
                    label="Is your direct manager a woman?"
                    error={errors.diversity?.managerIsWoman?.message}
                  >
                    <Group mt="xs">
                      {YES_NO.map((option) => (
                        <Radio key={option.value} value={option.value} label={option.label} />
                      ))}
                    </Group>
                  </Radio.Group>
                )}
              />

              <Controller
                control={form.control}
                name="diversity.supportPrograms"
                render={({ field }) => (
                  <MultiSelect
                    {...field}
                    label="Support the company provides"
                    description="Optional. Choose everything that applies."
                    data={SUPPORT_PROGRAMS.map((program) => ({
                      value: program,
                      label: SUPPORT_PROGRAM_LABELS[program],
                    }))}
                    placeholder="Choose any that apply"
                  />
                )}
              />

              <Controller
                control={form.control}
                name="diversity.trustsCompanyResponse"
                render={({ field }) => (
                  <Radio.Group
                    {...field}
                    label="If something went wrong, do you think the company would handle it seriously?"
                    error={errors.diversity?.trustsCompanyResponse?.message}
                  >
                    <Group mt="xs">
                      {TRUST_OPTIONS.map((option) => (
                        <Radio key={option.value} value={option.value} label={option.label} />
                      ))}
                    </Group>
                  </Radio.Group>
                )}
              />
            </Stack>
          </Section>

          {/* ---------------- Benefits ---------------- */}
          <Section
            area="benefits"
            enabled={enabled.benefits}
            onToggle={(value) => form.setValue('enabled.benefits', value)}
          >
            <Controller
              control={form.control}
              name="benefits.benefits"
              render={({ field }) => (
                <Checkbox.Group
                  {...field}
                  label="Benefits you receive"
                  error={errors.benefits?.benefits?.message}
                >
                  <Stack gap="xs" mt="xs">
                    {BENEFIT_OPTIONS.map((benefit) => (
                      <Checkbox key={benefit} value={benefit} label={BENEFIT_LABELS[benefit]} />
                    ))}
                  </Stack>
                </Checkbox.Group>
              )}
            />
          </Section>

          {/* ---------------- Maternity ---------------- */}
          <Section
            area="maternity"
            enabled={enabled.maternity}
            onToggle={(value) => form.setValue('enabled.maternity', value)}
          >
            <Group grow align="flex-start">
              <Controller
                control={form.control}
                name="maternity.paidWeeks"
                render={({ field }) => (
                  <NumberInput
                    {...field}
                    label="Weeks of paid leave"
                    placeholder="16"
                    min={0}
                    allowDecimal={false}
                    error={errors.maternity?.paidWeeks?.message}
                  />
                )}
              />
              <Controller
                control={form.control}
                name="maternity.payPercent"
                render={({ field }) => (
                  <NumberInput
                    {...field}
                    label="Percent of salary paid"
                    placeholder="100"
                    min={0}
                    max={100}
                    suffix="%"
                    error={errors.maternity?.payPercent?.message}
                  />
                )}
              />
            </Group>
          </Section>

          <FormErrorAlert
            error={submit.error}
            onRetry={() => void handleSubmit()}
            isRetrying={submit.isPending}
          />

          <Group justify="flex-end">
            <SubmitButton isPending={submit.isPending} pendingLabel="Saving…">
              {isEditing ? 'Save changes' : 'Submit'}
            </SubmitButton>
          </Group>
        </Stack>
      </form>
    </Stack>
  );
}

interface SectionProps {
  area: MetricAreaId;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  children: ReactNode;
}

/** One collapsible section of the form. Fields only validate when switched on. */
function Section({ area, enabled, onToggle, children }: SectionProps) {
  return (
    <Paper withBorder p="lg" id={`section-${area}`}>
      <Group justify="space-between" align="center" mb={enabled ? 'md' : 0}>
        <Title order={2} size="var(--ship-text-lg)">
          {METRIC_AREA_LABELS[area]}
        </Title>
        <Switch
          checked={enabled}
          onChange={(event) => onToggle(event.currentTarget.checked)}
          label={enabled ? 'Included' : 'Add this section'}
          aria-label={`Include ${METRIC_AREA_LABELS[area]} in your submission`}
        />
      </Group>
      {enabled ? children : null}
    </Paper>
  );
}
