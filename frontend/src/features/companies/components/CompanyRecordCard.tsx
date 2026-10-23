import { Badge, Group, Paper, Stack, Text, Title } from '@mantine/core';
import { Link } from 'react-router-dom';
import { Building2, ChevronRight } from 'lucide-react';
import type { CompanyRecord } from '@/shared/types/demoSearch';
import { paths } from '@/shared/config/paths';
import { formatHostname } from '@/shared/utils/format';
import { VerificationBadge } from './profile/VerificationBadge';
import styles from './CompanyRecordCard.module.css';

export interface CompanyRecordCardProps {
  company: CompanyRecord;
  /** Match score from the search, shown so ranking is easy to check in the demo. */
  score?: number;
}

/**
 * One company search result. The company name links to the company page; the
 * whole card is clickable through that link (see the CSS), so there is still
 * only one focusable control per card.
 */
export function CompanyRecordCard({ company, score }: CompanyRecordCardProps) {
  return (
    <Paper component="article" withBorder p="md" className={styles.card}>
      <Group align="flex-start" wrap="nowrap" gap="md">
        <span className={styles.logo} aria-hidden="true">
          <Building2 size={20} />
        </span>

        <Stack gap={6} className={styles.body}>
          <Group gap="xs" wrap="wrap">
            <Title order={3} size="var(--ship-text-md)" className={styles.name}>
              <Link to={paths.companyDetail(company.id)} className={styles.nameLink}>
                {company.name}
              </Link>
            </Title>
            <VerificationBadge status={company.verification.status} />
            {score !== undefined && score < 1 ? (
              <Text size="xs" c="dimmed">
                match {Math.round(score * 100)}%
              </Text>
            ) : null}
          </Group>

          <Text size="sm" c="dimmed">
            {company.location} · {formatHostname(company.website)}
          </Text>

          <Text size="sm" lineClamp={2}>
            {company.intro}
          </Text>

          <Group gap={6} wrap="wrap">
            {company.mainFocus.map((focus) => (
              <Badge key={focus} size="sm" variant="outline" color="gray">
                {focus}
              </Badge>
            ))}
          </Group>
        </Stack>

        <ChevronRight size={18} aria-hidden="true" className={styles.chevron} />
      </Group>
    </Paper>
  );
}
