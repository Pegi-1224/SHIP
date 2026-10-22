import { type ReactNode, useState } from 'react';
import {
  Anchor,
  Badge,
  Button,
  Group,
  List,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { Building2, ChevronDown, ChevronUp } from 'lucide-react';
import type { CompanyRecord, VerificationStatus } from '@/shared/types/demoSearch';
import {
  formatDate,
  formatHostname,
  formatPercent,
  formatUsd,
  formatWeeks,
} from '@/shared/utils/format';
import styles from './CompanyRecordCard.module.css';

const VERIFICATION_BADGE: Record<VerificationStatus, { label: string; color: string }> = {
  verified: { label: 'AI verified', color: 'green' },
  needs_review: { label: 'Needs review', color: 'yellow' },
  unverified: { label: 'Not verified', color: 'gray' },
};

/** `2026-09-28` is a calendar date; pin it to midday so no time zone shifts the day. */
function formatDay(value: string | null): string {
  return formatDate(value ? `${value}T12:00:00` : null);
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Stack gap={4}>
      <Text size="xs" fw={700} tt="uppercase" c="dimmed">
        {title}
      </Text>
      {children}
    </Stack>
  );
}

export interface CompanyRecordCardProps {
  company: CompanyRecord;
  /** Match score from the search, shown so ranking is easy to check in the demo. */
  score?: number;
}

/** One company search result: summary always visible, every field behind "Show details". */
export function CompanyRecordCard({ company, score }: CompanyRecordCardProps) {
  const [open, setOpen] = useState(false);
  const badge = VERIFICATION_BADGE[company.verification.status];
  const detailsId = `company-details-${company.id}`;

  return (
    <Paper component="article" withBorder p="md" className={styles.card}>
      <Group align="flex-start" wrap="nowrap" gap="md">
        <span className={styles.logo} aria-hidden="true">
          <Building2 size={20} />
        </span>

        <Stack gap={6} className={styles.body}>
          <Group gap="xs" wrap="wrap">
            <Title order={3} size="var(--ship-text-md)" className={styles.name}>
              {company.name}
            </Title>
            <Badge size="sm" variant="light" color={badge.color}>
              {badge.label}
            </Badge>
            {score !== undefined && score < 1 ? (
              <Text size="xs" c="dimmed">
                match {Math.round(score * 100)}%
              </Text>
            ) : null}
          </Group>

          <Text size="sm" c="dimmed">
            {company.location} ·{' '}
            <Anchor href={company.website} target="_blank" rel="noreferrer" size="sm">
              {formatHostname(company.website)}
            </Anchor>
          </Text>

          <Text size="sm">{company.intro}</Text>

          <Group gap={6} wrap="wrap">
            {company.mainFocus.map((focus) => (
              <Badge key={focus} size="sm" variant="outline" color="gray">
                {focus}
              </Badge>
            ))}
          </Group>

          <Button
            variant="subtle"
            size="compact-sm"
            className={styles.toggle}
            rightSection={open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            aria-expanded={open}
            aria-controls={detailsId}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? 'Hide details' : 'Show details'}
          </Button>

          {open ? (
            <SimpleGrid id={detailsId} cols={{ base: 1, sm: 2 }} spacing="md" mt="xs">
              <Section title="Contact">
                <Text size="sm">{company.address}</Text>
                <Text size="sm">
                  <Anchor href={`mailto:${company.email}`} size="sm">
                    {company.email}
                  </Anchor>{' '}
                  · {company.phone}
                </Text>
                <List size="sm" spacing={2}>
                  {company.contacts.map((contact) => (
                    <List.Item key={contact.email}>
                      {contact.name} ({contact.role}) -{' '}
                      <Anchor href={`mailto:${contact.email}`} size="sm">
                        {contact.email}
                      </Anchor>
                    </List.Item>
                  ))}
                </List>
              </Section>

              <Section title="Salary (online info)">
                {company.salary ? (
                  <>
                    <Text size="sm">
                      Average {formatUsd(company.salary.averageAnnualUsd)}
                      {company.salary.rangeUsd
                        ? ` · range ${formatUsd(company.salary.rangeUsd.min)}–${formatUsd(company.salary.rangeUsd.max)}`
                        : ''}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {company.salary.basis}
                    </Text>
                  </>
                ) : (
                  <Text size="sm" c="dimmed">
                    Not published
                  </Text>
                )}
              </Section>

              <Section title="Women support">
                {company.womenSupport ? (
                  <>
                    <Text size="sm">
                      Women in workforce {formatPercent(company.womenSupport.womenWorkforcePct)} ·
                      in leadership {formatPercent(company.womenSupport.womenLeadershipPct)}
                    </Text>
                    <List size="sm" spacing={2}>
                      {company.womenSupport.programs.map((program) => (
                        <List.Item key={program}>{program}</List.Item>
                      ))}
                    </List>
                  </>
                ) : (
                  <Text size="sm" c="dimmed">
                    Not published
                  </Text>
                )}
              </Section>

              <Section title="Paid maternity leave">
                {company.paidMaternityLeave ? (
                  <>
                    <Text size="sm">
                      {formatWeeks(company.paidMaternityLeave.paidWeeks)} at{' '}
                      {formatPercent(company.paidMaternityLeave.payPercent)} pay
                    </Text>
                    {company.paidMaternityLeave.notes ? (
                      <Text size="xs" c="dimmed">
                        {company.paidMaternityLeave.notes}
                      </Text>
                    ) : null}
                  </>
                ) : (
                  <Text size="sm" c="dimmed">
                    Not published
                  </Text>
                )}
              </Section>

              <Section title="Benefits">
                {company.benefits.length > 0 ? (
                  <List size="sm" spacing={2}>
                    {company.benefits.map((benefit) => (
                      <List.Item key={benefit}>{benefit}</List.Item>
                    ))}
                  </List>
                ) : (
                  <Text size="sm" c="dimmed">
                    Not published
                  </Text>
                )}
              </Section>

              <Section title="Sources and verification">
                <List size="sm" spacing={2}>
                  {company.sources.map((source) => (
                    <List.Item key={source.url}>
                      <Anchor href={source.url} target="_blank" rel="noreferrer" size="sm">
                        {source.label}
                      </Anchor>
                    </List.Item>
                  ))}
                </List>
                <Text size="xs" c="dimmed">
                  Data collected {formatDay(company.dataCollectedAt)}. {badge.label}
                  {company.verification.checkedAt
                    ? ` on ${formatDay(company.verification.checkedAt)}`
                    : ''}
                  {company.verification.confidence !== null
                    ? ` (confidence ${Math.round(company.verification.confidence * 100)}%)`
                    : ''}
                  .
                </Text>
                {company.verification.notes ? (
                  <Text size="xs" c="dimmed">
                    {company.verification.notes}
                  </Text>
                ) : null}
              </Section>
            </SimpleGrid>
          ) : null}
        </Stack>
      </Group>
    </Paper>
  );
}
