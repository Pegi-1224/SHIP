import { Badge, Paper, Stack, Text, Title } from '@mantine/core';
import { Bar, BarChart, Cell, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import type { MetricComparison } from '../utils/comparison';
import { formatPercent, formatUsd, formatUsdShort, formatWeeks } from '@/shared/utils/format';
import styles from './ComparisonMetric.module.css';

export interface ComparisonMetricProps {
  comparison: MetricComparison;
  companyAName: string;
  companyBName: string;
}

const STATUS_LABELS: Record<MetricComparison['status'], string> = {
  a_leads: 'Difference found',
  b_leads: 'Difference found',
  similar: 'Similar',
  different: 'Described, not ranked',
  not_enough_data: 'Not enough data',
  not_comparable: 'Not comparable',
};

const STATUS_COLORS: Record<MetricComparison['status'], string> = {
  a_leads: 'ship',
  b_leads: 'ship',
  similar: 'gray',
  different: 'blue',
  not_enough_data: 'gray',
  not_comparable: 'orange',
};

function formatValue(value: number | null, unit: MetricComparison['unit']): string {
  if (value === null) return 'Not reported';
  switch (unit) {
    case 'usd':
      return formatUsd(value);
    case 'percent':
    case 'percentage_points':
      return formatPercent(value, 1);
    case 'weeks':
      return formatWeeks(value);
    case 'count':
      return String(value);
  }
}

function shortValue(value: number, unit: MetricComparison['unit']): string {
  switch (unit) {
    case 'usd':
      return formatUsdShort(value);
    case 'percent':
    case 'percentage_points':
      return `${value}%`;
    case 'weeks':
      return `${value}w`;
    case 'count':
      return String(value);
  }
}

/**
 * One metric area of the comparison: the generated sentence, a bar chart, and
 * the same numbers as text.
 *
 * The chart is `aria-hidden` and the table beside it carries the real content,
 * so the comparison is fully usable without seeing the bars or distinguishing
 * the two colours (spec 9, accessibility).
 */
export function ComparisonMetric({ comparison, companyAName, companyBName }: ComparisonMetricProps) {
  const { values, unit } = comparison;
  const canChart =
    values.a !== null &&
    values.b !== null &&
    comparison.status !== 'not_comparable' &&
    comparison.status !== 'not_enough_data';

  const chartData =
    values.a !== null && values.b !== null
      ? [
          { name: companyAName, value: values.a, fill: 'var(--ship-chart-a)' },
          { name: companyBName, value: values.b, fill: 'var(--ship-chart-b)' },
        ]
      : [];

  return (
    <Paper component="section" withBorder p="lg">
      <Stack gap="sm">
        <div>
          <Title order={3} size="var(--ship-text-lg)">
            {comparison.label}
          </Title>
          <Badge mt={6} size="sm" variant="light" color={STATUS_COLORS[comparison.status]}>
            {STATUS_LABELS[comparison.status]}
          </Badge>
        </div>

        <Text size="sm">{comparison.sentence}</Text>

        {comparison.detail ? (
          <Text size="xs" c="dimmed">
            {comparison.detail}
          </Text>
        ) : null}

        {canChart && chartData.length === 2 ? (
          <div className={styles.chartWrap} aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 16, right: 8, bottom: 8, left: 8 }}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(value: number) => shortValue(value, unit)}
                  width={60}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} isAnimationActive={false}>
                  {chartData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : null}

        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <caption>{comparison.label}: the numbers behind this comparison</caption>
            <thead>
              <tr>
                <th scope="col">Company</th>
                <th scope="col">Value</th>
                <th scope="col">Source</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">{companyAName}</th>
                <td>{formatValue(values.a, unit)}</td>
                <td>
                  {comparison.sourceUsed === 'public'
                    ? 'Public data'
                    : comparison.sourceUsed === 'user_reported'
                      ? 'User reported'
                      : '—'}
                </td>
              </tr>
              <tr>
                <th scope="row">{companyBName}</th>
                <td>{formatValue(values.b, unit)}</td>
                <td>
                  {comparison.sourceUsed === 'public'
                    ? 'Public data'
                    : comparison.sourceUsed === 'user_reported'
                      ? 'User reported'
                      : '—'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Stack>
    </Paper>
  );
}
