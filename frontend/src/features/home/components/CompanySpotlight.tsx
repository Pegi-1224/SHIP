import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Skeleton } from '@mantine/core';
import { useDemoCompanySearch } from '@/features/companies';
import { paths } from '@/shared/config/paths';
import type { Industry } from '@/shared/types/common';
import type { CompanyRecord } from '@/shared/types/demoSearch';
import { formatPercent, formatUsdShort, formatWeeks } from '@/shared/utils/format';
import styles from './ForYouHome.module.css';

/** The facts shown for the suggested company, from its published data. */
function companyFacts(company: CompanyRecord): Array<[string, string]> {
  const benefits = company.benefits;
  return [
    ['Pay', formatUsdShort(company.salary?.averageAnnualUsd)],
    ['Promotion', `${formatPercent(company.promotion?.womenInManagementPct)} women managers`],
    ['Support', `${formatPercent(company.womenSupport?.womenWorkforcePct)} women staff`],
    [
      'Benefits',
      benefits.length > 0
        ? `${benefits[0]}${benefits.length > 1 ? ` +${benefits.length - 1}` : ''}`
        : 'Not published',
    ],
    ['Maternity leave', `${formatWeeks(company.paidMaternityLeave?.paidWeeks)} paid`],
  ];
}

/** "Tech, Finance", "the companies you follow", or both. */
function sourceText(industries: readonly Industry[], following: boolean): string {
  const parts = [
    ...(following ? ['the companies you follow'] : []),
    ...(industries.length > 0 ? [industries.join(', ')] : []),
  ];
  return parts.join(' and ');
}

/**
 * "Look up a company": one random company from the industries the user chose
 * in the assessment (question 2) or the companies they follow (question 5),
 * with a few of its numbers and a link to its page. Falls back to any company
 * when none matches yet.
 */
export function CompanySpotlight({
  industries,
  followedCompanyIds,
}: {
  industries: readonly Industry[];
  followedCompanyIds: readonly string[];
}) {
  const companies = useDemoCompanySearch('');
  // Picked once per visit, so the suggestion does not jump around while the page re-renders.
  const [pick] = useState(() => Math.random());

  const all = companies.data?.items.map((hit) => hit.item) ?? [];
  const matching = all.filter(
    (company) => industries.includes(company.industry) || followedCompanyIds.includes(company.id),
  );
  const candidates = matching.length > 0 ? matching : all;
  const chosen = sourceText(industries, followedCompanyIds.length > 0);
  const company = candidates[Math.floor(pick * candidates.length)];

  return (
    <section className={styles.spotlight} aria-labelledby="home-company-title">
      <h2 id="home-company-title" className={styles.spotlightTitle}>
        Look up a company
      </h2>
      <p className={styles.spotlightHint}>
        {matching.length > 0 || chosen === ''
          ? `Picked from ${chosen || 'all industries'}`
          : `No companies from ${chosen} yet, so here’s another`}
      </p>

      <div className={styles.spotlightCard}>
        {companies.isPending ? <Skeleton height={176} radius={8} /> : null}
        {companies.isError ? (
          <p className={styles.muted}>We couldn’t load a company right now.</p>
        ) : null}
        {company ? (
          <>
            <p className={styles.companyName}>{company.name}</p>
            <p className={styles.companyMeta}>
              {company.industry} · {company.location}
            </p>
            <dl className={styles.facts}>
              {companyFacts(company).map(([label, value]) => (
                <div key={label} className={styles.fact}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </>
        ) : null}
      </div>

      {company ? (
        <Link to={paths.companyDetail(company.id)} className={styles.spotlightButton}>
          Look up the details
        </Link>
      ) : null}
    </section>
  );
}
