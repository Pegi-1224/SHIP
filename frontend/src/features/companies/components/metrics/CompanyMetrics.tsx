import { Button, Text } from '@mantine/core';
import { Banknote, Baby, HeartHandshake, TrendingUp, Users } from 'lucide-react';
import type { CompanyProfile, MetricAreaId } from '@/shared/types/company';
import {
  BENEFIT_LABELS,
  COMPENSATION_DEFINITION_LABELS,
  METRIC_AREA_LABELS,
  SUPPORT_PROGRAM_LABELS,
  SUPPORT_PROGRAMS,
} from '@/shared/types/company';
import {
  DataPoint,
  MetricCard,
  MissingDataNotice,
  SourceLabel,
  ThresholdNotice,
} from '@/shared/ui';
import { formatCount, formatMonths, formatPercent, formatUsd, formatWeeks } from '@/shared/utils/format';
import { joinWithAnd } from '@/shared/utils/text';
import { MetricBranches } from './MetricBranches';
import styles from './metrics.module.css';

export interface MetricSectionProps {
  profile: CompanyProfile;
  /** Opens the submission form at this area. Omitted when the user cannot submit. */
  onShareData?: ((area: MetricAreaId) => void) | undefined;
}

/* -------------------------------------------------------------------------- */

export function SalaryMetric({ profile, onShareData }: MetricSectionProps) {
  const publicData = profile.publicData.salary;
  const reported = profile.userReported.salary;
  const share = onShareData ? () => onShareData('salary') : undefined;

  const nothingAtAll = !publicData && reported.eligibleContributors === 0;

  return (
    <MetricCard
      title={METRIC_AREA_LABELS.salary}
      description="What people are paid, and on what basis."
      icon={<Banknote size={18} />}
      action={
        share ? (
          <Button size="xs" variant="light" onClick={share}>
            Share your data
          </Button>
        ) : null
      }
    >
      {nothingAtAll ? (
        <MissingDataNotice area="salary" onShareData={share} />
      ) : (
        <MetricBranches
          publicBranch={
            publicData ? (
              <>
                <dl className={styles.values}>
                  <DataPoint
                    label="Average salary"
                    value={publicData.averageAnnualUsd === null ? null : formatUsd(publicData.averageAnnualUsd)}
                    caption={`${COMPENSATION_DEFINITION_LABELS[publicData.compensationDefinition]} · ${publicData.population}`}
                    size="lg"
                  />
                  <DataPoint
                    label="Employees covered"
                    value={publicData.sampleSize === null ? null : publicData.sampleSize.toLocaleString('en-US')}
                    caption={publicData.location}
                  />
                </dl>
                <SourceLabel kind="public" source={publicData.source} />
              </>
            ) : (
              <Text size="sm" c="dimmed">
                This company does not publish a salary figure.
              </Text>
            )
          }
          userBranch={
            reported.summary ? (
              <>
                <dl className={styles.values}>
                  <DataPoint
                    label="Median reported salary"
                    value={formatUsd(reported.summary.medianAnnualUsd)}
                    caption={`${COMPENSATION_DEFINITION_LABELS[reported.summary.compensationDefinition]}, annual`}
                    size="lg"
                  />
                </dl>
                <Text size="xs" c="dimmed" className={styles.note}>
                  Across {formatCount(reported.summary.composition.roles.length, 'role')},{' '}
                  {formatCount(reported.summary.composition.levels.length, 'level')} and{' '}
                  {formatCount(reported.summary.composition.cities.length, 'city', 'cities')}. A
                  single median over a mixed group is not one person&apos;s salary.
                </Text>

                {reported.summary.comparableCohorts.length > 0 ? (
                  <div className={styles.tableScroll}>
                    <table className={styles.table}>
                      <caption className="ship-visually-hidden">
                        Reported salary by role and level
                      </caption>
                      <thead>
                        <tr>
                          <th scope="col">Role and level</th>
                          <th scope="col">Reports</th>
                          <th scope="col">Median</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reported.summary.comparableCohorts.map((cohort) => (
                          <tr key={`${cohort.role}-${cohort.level}`}>
                            <td>
                              {cohort.level} {cohort.role}
                            </td>
                            <td>{cohort.contributors}</td>
                            <td>{formatUsd(cohort.medianAnnualUsd)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}

                <SourceLabel
                  kind="user_reported"
                  contributors={reported.eligibleContributors}
                  lastSubmittedAt={reported.lastSubmittedAt}
                />
              </>
            ) : (
              <ThresholdNotice contributors={reported.eligibleContributors} onShareData={share} />
            )
          }
        />
      )}
    </MetricCard>
  );
}

/* -------------------------------------------------------------------------- */

export function PromotionMetric({ profile, onShareData }: MetricSectionProps) {
  const publicData = profile.publicData.promotion;
  const reported = profile.userReported.promotion;
  const share = onShareData ? () => onShareData('promotion') : undefined;

  const nothingAtAll = !publicData && reported.eligibleContributors === 0;

  return (
    <MetricCard
      title={METRIC_AREA_LABELS.promotion}
      description="Three separate measurements: who gets promoted, who holds leadership roles, and how long promotions take."
      icon={<TrendingUp size={18} />}
      action={
        share ? (
          <Button size="xs" variant="light" onClick={share}>
            Share your data
          </Button>
        ) : null
      }
    >
      {nothingAtAll ? (
        <MissingDataNotice area="promotion and leadership" onShareData={share} />
      ) : (
        <MetricBranches
          publicBranch={
            publicData ? (
              <>
                <dl className={styles.values}>
                  <DataPoint
                    label="Women's promotion rate"
                    value={formatPercent(publicData.womenPromotionRatePct, 1)}
                    caption={publicData.promotionRateDefinition}
                    size="lg"
                  />
                  <DataPoint
                    label="Women in leadership"
                    value={formatPercent(publicData.womenLeadershipPct, 1)}
                    caption={publicData.leadershipDefinition}
                    size="lg"
                  />
                </dl>
                <Text size="xs" c="dimmed" className={styles.note}>
                  These answer different questions. A high share of women in leadership does not
                  mean women are promoted at the same rate, and neither one implies the other.
                </Text>
                <SourceLabel kind="public" source={publicData.source} />
              </>
            ) : (
              <Text size="sm" c="dimmed">
                This company does not publish promotion or leadership figures.
              </Text>
            )
          }
          userBranch={
            reported.summary ? (
              <>
                <dl className={styles.values}>
                  <DataPoint
                    label="Median time to promotion"
                    value={formatMonths(reported.summary.medianMonthsToPromotion)}
                    caption="Reported by employees"
                    size="lg"
                  />
                </dl>
                <Text size="xs" c="dimmed" className={styles.note}>
                  Covering {joinWithAnd(reported.summary.composition.roles)}.
                </Text>
                {reported.summary.comparableCohorts.length > 0 ? (
                  <ul className={styles.list}>
                    {reported.summary.comparableCohorts.map((cohort) => (
                      <li key={`${cohort.fromLevel}-${cohort.toLevel}`}>
                        {cohort.fromLevel} to {cohort.toLevel}: {formatMonths(cohort.medianMonths)}{' '}
                        ({formatCount(cohort.contributors, 'report')})
                      </li>
                    ))}
                  </ul>
                ) : null}
                <SourceLabel
                  kind="user_reported"
                  contributors={reported.eligibleContributors}
                  lastSubmittedAt={reported.lastSubmittedAt}
                />
              </>
            ) : (
              <ThresholdNotice contributors={reported.eligibleContributors} onShareData={share} />
            )
          }
        />
      )}
    </MetricCard>
  );
}

/* -------------------------------------------------------------------------- */

export function DiversityMetric({ profile, onShareData }: MetricSectionProps) {
  const publicData = profile.publicData.diversity;
  const reported = profile.userReported.diversity;
  const share = onShareData ? () => onShareData('diversity') : undefined;

  const nothingAtAll = !publicData && reported.eligibleContributors === 0;

  return (
    <MetricCard
      title={METRIC_AREA_LABELS.diversity}
      description="How many women work here, and what support exists for them."
      icon={<Users size={18} />}
      action={
        share ? (
          <Button size="xs" variant="light" onClick={share}>
            Share your data
          </Button>
        ) : null
      }
    >
      {nothingAtAll ? (
        <MissingDataNotice area="women support and diversity" onShareData={share} />
      ) : (
        <MetricBranches
          publicBranch={
            publicData ? (
              <>
                <dl className={styles.values}>
                  <DataPoint
                    label="Women in the workforce"
                    value={formatPercent(publicData.womenWorkforcePct, 1)}
                    caption={publicData.population}
                    size="lg"
                  />
                </dl>
                <SourceLabel kind="public" source={publicData.source} />
              </>
            ) : (
              <Text size="sm" c="dimmed">
                This company does not publish a workforce breakdown.
              </Text>
            )
          }
          userBranch={
            reported.summary ? (
              <>
                <dl className={styles.values}>
                  <DataPoint
                    label="Women on the respondent's team"
                    value={
                      reported.summary.medianTeamWomenSharePct === null
                        ? null
                        : formatPercent(reported.summary.medianTeamWomenSharePct, 1)
                    }
                    caption="Median across reports"
                    size="lg"
                  />
                  <DataPoint
                    label="Report a woman as direct manager"
                    value={formatPercent(reported.summary.womanManagerSharePct, 0)}
                  />
                </dl>

                {reported.summary.excludedZeroTeamSize > 0 ? (
                  <Text size="xs" c="dimmed" className={styles.note}>
                    {formatCount(reported.summary.excludedZeroTeamSize, 'report')} gave a team size
                    of zero and {reported.summary.excludedZeroTeamSize === 1 ? 'was' : 'were'}{' '}
                    excluded from the share - a share cannot be calculated from an empty team, and
                    counting it as 0% would be wrong.
                  </Text>
                ) : null}

                <div>
                  <Text size="xs" fw={600} mb={4}>
                    Support programs people reported
                  </Text>
                  <ul className={styles.list}>
                    {SUPPORT_PROGRAMS.map((program) => (
                      <li key={program}>
                        {SUPPORT_PROGRAM_LABELS[program]}:{' '}
                        {formatCount(reported.summary?.supportProgramCounts[program] ?? 0, 'report')}
                      </li>
                    ))}
                  </ul>
                </div>

                <Text size="xs" c="dimmed" className={styles.note}>
                  Would the company handle a problem seriously? Yes:{' '}
                  {reported.summary.trustCounts.yes}, No: {reported.summary.trustCounts.no}, Not
                  sure: {reported.summary.trustCounts.not_sure}.
                </Text>

                <SourceLabel
                  kind="user_reported"
                  contributors={reported.eligibleContributors}
                  lastSubmittedAt={reported.lastSubmittedAt}
                />
              </>
            ) : (
              <ThresholdNotice contributors={reported.eligibleContributors} onShareData={share} />
            )
          }
        />
      )}
    </MetricCard>
  );
}

/* -------------------------------------------------------------------------- */

export function BenefitsMetric({ profile, onShareData }: MetricSectionProps) {
  const publicData = profile.publicData.benefits;
  const reported = profile.userReported.benefits;
  const share = onShareData ? () => onShareData('benefits') : undefined;

  const nothingAtAll = !publicData && reported.eligibleContributors === 0;

  return (
    <MetricCard
      title={METRIC_AREA_LABELS.benefits}
      description="What the company lists, and what employees say they actually received."
      icon={<HeartHandshake size={18} />}
      action={
        share ? (
          <Button size="xs" variant="light" onClick={share}>
            Share your data
          </Button>
        ) : null
      }
    >
      {nothingAtAll ? (
        <MissingDataNotice area="benefits" onShareData={share} />
      ) : (
        <MetricBranches
          publicBranch={
            publicData?.benefits ? (
              <>
                <ul className={styles.list}>
                  {publicData.benefits.map((benefit) => (
                    <li key={benefit}>{BENEFIT_LABELS[benefit]}</li>
                  ))}
                </ul>
                <Text size="xs" c="dimmed" className={styles.note}>
                  A longer list is not proof of a better employer. Companies group and name benefits
                  differently.
                </Text>
                <SourceLabel kind="public" source={publicData.source} />
              </>
            ) : (
              <Text size="sm" c="dimmed">
                This company does not publish a benefits list.
              </Text>
            )
          }
          userBranch={
            reported.summary ? (
              <>
                <ul className={styles.list}>
                  {Object.entries(reported.summary.benefitCounts)
                    .filter(([, count]) => count > 0)
                    .sort(([, left], [, right]) => right - left)
                    .map(([benefit, count]) => (
                      <li key={benefit}>
                        {BENEFIT_LABELS[benefit as keyof typeof BENEFIT_LABELS]}:{' '}
                        {formatCount(count, 'report')}
                      </li>
                    ))}
                </ul>
                <SourceLabel
                  kind="user_reported"
                  contributors={reported.eligibleContributors}
                  lastSubmittedAt={reported.lastSubmittedAt}
                />
              </>
            ) : (
              <ThresholdNotice contributors={reported.eligibleContributors} onShareData={share} />
            )
          }
        />
      )}
    </MetricCard>
  );
}

/* -------------------------------------------------------------------------- */

export function MaternityMetric({ profile, onShareData }: MetricSectionProps) {
  const publicData = profile.publicData.maternity;
  const reported = profile.userReported.maternity;
  const share = onShareData ? () => onShareData('maternity') : undefined;

  const nothingAtAll = !publicData && reported.eligibleContributors === 0;

  return (
    <MetricCard
      title={METRIC_AREA_LABELS.maternity}
      description="Weeks of leave and how much of your salary continues."
      icon={<Baby size={18} />}
      action={
        share ? (
          <Button size="xs" variant="light" onClick={share}>
            Share your data
          </Button>
        ) : null
      }
    >
      {nothingAtAll ? (
        <MissingDataNotice area="paid maternity leave" onShareData={share} />
      ) : (
        <MetricBranches
          publicBranch={
            publicData ? (
              <>
                <dl className={styles.values}>
                  <DataPoint
                    label="Paid leave"
                    value={publicData.paidWeeks === null ? null : formatWeeks(publicData.paidWeeks)}
                    caption={publicData.policyScope}
                    size="lg"
                  />
                  <DataPoint
                    label="Salary paid during leave"
                    value={formatPercent(publicData.payPercent, 0)}
                  />
                </dl>
                <Text size="xs" c="dimmed" className={styles.note}>
                  Weeks alone do not describe a policy. Sixteen weeks at 60% is not the same offer
                  as sixteen weeks at 100%.
                </Text>
                <SourceLabel kind="public" source={publicData.source} />
              </>
            ) : (
              <Text size="sm" c="dimmed">
                This company does not publish a leave policy.
              </Text>
            )
          }
          userBranch={
            reported.summary ? (
              <>
                <dl className={styles.values}>
                  <DataPoint
                    label="Median reported leave"
                    value={formatWeeks(reported.summary.medianPaidWeeks)}
                    size="lg"
                  />
                  <DataPoint
                    label="Median salary paid"
                    value={formatPercent(reported.summary.medianPayPercent, 0)}
                  />
                </dl>
                <SourceLabel
                  kind="user_reported"
                  contributors={reported.eligibleContributors}
                  lastSubmittedAt={reported.lastSubmittedAt}
                />
              </>
            ) : (
              <ThresholdNotice contributors={reported.eligibleContributors} onShareData={share} />
            )
          }
        />
      )}
    </MetricCard>
  );
}
