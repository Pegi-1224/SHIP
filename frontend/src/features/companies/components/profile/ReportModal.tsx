import { useState, type FormEvent } from 'react';
import {
  Button,
  Chip,
  Group,
  Modal,
  NumberInput,
  Radio,
  Stack,
  TagsInput,
  Text,
} from '@mantine/core';
import { MIN_ELIGIBLE_CONTRIBUTORS } from '@/shared/config/constants';
import { isApiError } from '@/shared/api';
import type { CompanyRecord } from '@/shared/types/demoSearch';
import {
  REPORT_LIMITS,
  validateReport,
  type DemoReportArea,
  type ReportFieldErrors,
} from '@/shared/utils/demoReports';
import { FormErrorAlert, notifySuccess, SubmitButton } from '@/shared/ui';
import { useSubmitDemoReport } from '../../hooks/useCompanies';

const TITLES: Record<DemoReportArea, string> = {
  salary: 'Report your salary',
  promotion: 'Report time to promotion',
  diversity: 'Report on women support & diversity',
  maternity: 'Report paid maternity leave',
  benefits: 'Report welfare benefits',
};

/** Offered as chips next to the company's own published benefits. */
const COMMON_BENEFITS = [
  'Health insurance',
  'Fertility support',
  'Childcare stipend',
  'Backup childcare',
  'Lactation rooms',
  'Mental health support',
  'Flexible hours',
  'Remote work',
  'Learning budget',
];

type YesNo = 'yes' | 'no' | null;

interface FormValues {
  annualSalaryUsd: number | string;
  monthsToPromotion: number | string;
  hasWomanManager: YesNo;
  womanInCSuite: YesNo;
  womenOnTeamPct: number | string;
  feelIncluded: YesNo;
  paidWeeks: number | string;
  payPercent: number | string;
  benefits: string[];
  otherBenefits: string[];
}

const EMPTY: FormValues = {
  annualSalaryUsd: '',
  monthsToPromotion: '',
  hasWomanManager: null,
  womanInCSuite: null,
  womenOnTeamPct: '',
  feelIncluded: null,
  paidWeeks: '',
  payPercent: '',
  benefits: [],
  otherBenefits: [],
};

const toNumber = (value: number | string) => (typeof value === 'number' ? value : undefined);
const toBoolean = (value: YesNo) => (value === null ? undefined : value === 'yes');

/** The request body for `area`; `validateReport` decides whether it is acceptable. */
function buildReport(area: DemoReportArea, values: FormValues): unknown {
  switch (area) {
    case 'salary':
      return { area, annualSalaryUsd: toNumber(values.annualSalaryUsd) };
    case 'promotion':
      return { area, monthsToPromotion: toNumber(values.monthsToPromotion) };
    case 'diversity':
      return {
        area,
        hasWomanManager: toBoolean(values.hasWomanManager),
        womanInCSuite: toBoolean(values.womanInCSuite),
        womenOnTeamPct: toNumber(values.womenOnTeamPct),
        feelIncluded: toBoolean(values.feelIncluded),
      };
    case 'maternity':
      return {
        area,
        paidWeeks: toNumber(values.paidWeeks),
        payPercent: toNumber(values.payPercent),
      };
    case 'benefits':
      return { area, benefits: [...values.benefits, ...values.otherBenefits] };
  }
}

function YesNoField({
  label,
  value,
  error,
  onChange,
}: {
  label: string;
  value: YesNo;
  error: string | undefined;
  onChange: (value: YesNo) => void;
}) {
  return (
    <Radio.Group
      label={label}
      value={value}
      onChange={(next) => onChange(next as YesNo)}
      error={error}
      required
    >
      <Group gap="lg" mt={6}>
        <Radio value="yes" label="Yes" />
        <Radio value="no" label="No" />
      </Group>
    </Radio.Group>
  );
}

interface ReportFormProps {
  company: CompanyRecord;
  area: DemoReportArea;
  onDone: () => void;
}

function ReportForm({ company, area, onDone }: ReportFormProps) {
  const [values, setValues] = useState<FormValues>(EMPTY);
  const [fieldErrors, setFieldErrors] = useState<ReportFieldErrors>({});
  const submit = useSubmitDemoReport(company.id);

  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }));
  const errorFor = (field: string) =>
    fieldErrors[field]?.[0] ??
    (isApiError(submit.error) ? submit.error.fieldErrors?.[field]?.[0] : undefined);

  const send = () => {
    const result = validateReport(buildReport(area, values));
    if (!result.ok) {
      setFieldErrors(result.fieldErrors);
      return;
    }
    setFieldErrors({});
    submit.mutate(result.report, {
      onSuccess: ({ savedToFile }) => {
        notifySuccess(
          savedToFile
            ? 'Thanks! Your report was saved to the demo data.'
            : 'Thanks! Your report was added for this session.',
          'Report added',
        );
        onDone();
      },
    });
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    send();
  };

  const benefitChoices = [...new Set([...company.benefits, ...COMMON_BENEFITS])];

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Anonymous. We only show averages, and only once {MIN_ELIGIBLE_CONTRIBUTORS} people have
          reported.
        </Text>

        {area === 'salary' ? (
          <NumberInput
            label="Your annual base salary (USD)"
            prefix="$"
            thousandSeparator=","
            min={REPORT_LIMITS.salaryUsd.min}
            max={REPORT_LIMITS.salaryUsd.max}
            allowNegative={false}
            clampBehavior="none"
            value={values.annualSalaryUsd}
            onChange={(value) => set('annualSalaryUsd', value)}
            error={errorFor('annualSalaryUsd')}
            required
            data-autofocus
          />
        ) : null}

        {area === 'promotion' ? (
          <NumberInput
            label="Months until your most recent promotion"
            description="Counted from when you joined, or from your previous promotion."
            min={REPORT_LIMITS.months.min}
            max={REPORT_LIMITS.months.max}
            allowNegative={false}
            clampBehavior="none"
            value={values.monthsToPromotion}
            onChange={(value) => set('monthsToPromotion', value)}
            error={errorFor('monthsToPromotion')}
            required
            data-autofocus
          />
        ) : null}

        {area === 'diversity' ? (
          <>
            <YesNoField
              label="Is your direct manager a woman?"
              value={values.hasWomanManager}
              error={errorFor('hasWomanManager')}
              onChange={(value) => set('hasWomanManager', value)}
            />
            <YesNoField
              label="Is there a woman in the C-suite?"
              value={values.womanInCSuite}
              error={errorFor('womanInCSuite')}
              onChange={(value) => set('womanInCSuite', value)}
            />
            <NumberInput
              label="Roughly what share of your team are women? (%)"
              suffix="%"
              min={REPORT_LIMITS.percent.min}
              max={REPORT_LIMITS.percent.max}
              allowNegative={false}
              clampBehavior="none"
              value={values.womenOnTeamPct}
              onChange={(value) => set('womenOnTeamPct', value)}
              error={errorFor('womenOnTeamPct')}
              required
            />
            <YesNoField
              label="Do you feel included at work?"
              value={values.feelIncluded}
              error={errorFor('feelIncluded')}
              onChange={(value) => set('feelIncluded', value)}
            />
          </>
        ) : null}

        {area === 'maternity' ? (
          <>
            <NumberInput
              label="Paid weeks of maternity leave"
              description="What you took or were offered."
              min={REPORT_LIMITS.weeks.min}
              max={REPORT_LIMITS.weeks.max}
              allowNegative={false}
              clampBehavior="none"
              value={values.paidWeeks}
              onChange={(value) => set('paidWeeks', value)}
              error={errorFor('paidWeeks')}
              required
              data-autofocus
            />
            <NumberInput
              label="Pay during leave (% of your normal pay)"
              suffix="%"
              min={REPORT_LIMITS.percent.min}
              max={REPORT_LIMITS.percent.max}
              allowNegative={false}
              clampBehavior="none"
              value={values.payPercent}
              onChange={(value) => set('payPercent', value)}
              error={errorFor('payPercent')}
              required
            />
          </>
        ) : null}

        {area === 'benefits' ? (
          <>
            <div>
              <Text size="sm" fw={500} mb={8}>
                Which benefits do you actually get?
              </Text>
              <Chip.Group
                multiple
                value={values.benefits}
                onChange={(value) => set('benefits', value)}
              >
                <Group gap={8}>
                  {benefitChoices.map((benefit) => (
                    <Chip key={benefit} value={benefit} size="sm">
                      {benefit}
                    </Chip>
                  ))}
                </Group>
              </Chip.Group>
            </div>
            <TagsInput
              label="Other benefits"
              description="Type one and press Enter."
              maxTags={REPORT_LIMITS.benefits.maxItems}
              value={values.otherBenefits}
              onChange={(value) => set('otherBenefits', value)}
              error={errorFor('benefits')}
            />
          </>
        ) : null}

        <FormErrorAlert error={submit.error} onRetry={send} isRetrying={submit.isPending} />

        <Group justify="flex-end" gap="sm">
          <Button variant="default" onClick={onDone}>
            Cancel
          </Button>
          <SubmitButton isPending={submit.isPending} pendingLabel="Sending report…">
            Submit report
          </SubmitButton>
        </Group>
      </Stack>
    </form>
  );
}

interface ReportModalProps {
  company: CompanyRecord;
  /** The box being reported on; `null` keeps the modal closed. */
  area: DemoReportArea | null;
  onClose: () => void;
}

/** The form behind "Be the first" and "Add yours" on the company page. */
export function ReportModal({ company, area, onClose }: ReportModalProps) {
  return (
    <Modal opened={area !== null} onClose={onClose} title={area ? TITLES[area] : ''} centered>
      {area ? <ReportForm key={area} company={company} area={area} onDone={onClose} /> : null}
    </Modal>
  );
}
