import { Badge, Button, Group, Paper, Stack, Text, Title } from '@mantine/core';
import { Link } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import type { Company } from '@/shared/types/company';
import { paths } from '@/shared/config/paths';
import { formatHostname } from '@/shared/utils/format';
import styles from './CompanyCard.module.css';

export interface CompanyCardProps {
  company: Company;
  /** Replaces the default "View profile" link, e.g. with a Compare action. */
  action?: { label: string; onClick: () => void };
  /** Renders the card as a plain block instead of a link target. */
  interactive?: boolean;
}

/**
 * Summary card used in company search results, comparison pickers and the
 * assessment's "companies you follow" question.
 */
export function CompanyCard({ company, action, interactive = true }: CompanyCardProps) {
  return (
    <Paper component="article" withBorder p="md" className={styles.card}>
      <Group align="flex-start" wrap="nowrap" gap="md">
        <span className={styles.logo} aria-hidden="true">
          <Building2 size={20} />
        </span>

        <Stack gap={4} className={styles.body}>
          <Group gap="xs" wrap="wrap">
            <Title order={3} size="var(--ship-text-md)" className={styles.name}>
              {interactive && !action ? (
                <Link to={paths.companyDetail(company.id)} className={styles.nameLink}>
                  {company.name}
                </Link>
              ) : (
                company.name
              )}
            </Title>
            <Badge size="sm" variant="light" color="gray">
              {company.industry}
            </Badge>
          </Group>

          <Text size="sm" c="dimmed">
            {company.headquartersCity} · {formatHostname(company.website)}
          </Text>
        </Stack>

        {action ? (
          <Button size="sm" variant="light" onClick={action.onClick} className={styles.action}>
            {action.label}
          </Button>
        ) : null}
      </Group>
    </Paper>
  );
}
