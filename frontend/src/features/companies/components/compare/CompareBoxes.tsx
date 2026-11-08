/**
 * The comparison page's metric boxes: the company page's five boxes, with the second company in
 * place of the user-reported column. Public data only (UI design, Nov 2026).
 */
import type { ReactNode } from 'react';
import type { CompanyRecord } from '@/shared/types/demoSearch';
import { formatPercent, formatUsd } from '@/shared/utils/format';
import profile from '../profile/profile.module.css';
import styles from './compare.module.css';
import { SIDE_COLORS } from './sideColors';

interface PairProps {
  a: CompanyRecord;
  b: CompanyRecord;
}

function Box({ title, short, children }: { title: string; short?: boolean; children: ReactNode }) {
  return (
    <section
      className={`${profile.box} ${short ? profile.boxShort : ''} ${styles.box}`}
      aria-label={title}
    >
      <div className={styles.boxHeader}>
        <h2 className={profile.boxTitle}>{title}</h2>
        <span className={styles.publicTag}>Public data</span>
      </div>
      <div className={profile.boxBody}>{children}</div>
    </section>
  );
}

function Dot({ side }: { side: 'a' | 'b' }) {
  return (
    <span
      className={profile.dot}
      style={{ backgroundColor: SIDE_COLORS[side] }}
      aria-hidden="true"
    />
  );
}

function NotPublished() {
  return <span className={profile.salaryMissing}>Not published</span>;
}

/** "Northwind  [=====     ]  40%", one per company. */
function PercentRows({
  a,
  b,
  valueA,
  valueB,
}: PairProps & { valueA: number | null; valueB: number | null }) {
  const rows = [
    { side: 'a' as const, name: a.name, value: valueA },
    { side: 'b' as const, name: b.name, value: valueB },
  ];
  return (
    <div className={styles.rows}>
      {rows.map((row) => (
        <div key={row.side} className={styles.row}>
          <span className={styles.rowName} title={row.name}>
            {row.name}
          </span>
          <span className={profile.track} aria-hidden="true">
            <span
              className={profile.fill}
              style={{
                display: 'block',
                width: `${Math.min(Math.max(row.value ?? 0, 0), 100)}%`,
                backgroundColor: SIDE_COLORS[row.side],
              }}
            />
          </span>
          <span className={profile.percentValue}>{formatPercent(row.value)}</span>
        </div>
      ))}
    </div>
  );
}

/** Two names over two values, as the company page shows "Public data" over "User reported". */
function Columns({ a, b, children }: PairProps & { children: [ReactNode, ReactNode] }) {
  return (
    <div className={`${profile.salaryColumns} ${styles.columns}`}>
      <span className={styles.columnName}>{a.name}</span>
      <span className={styles.columnName}>{b.name}</span>
      {children}
    </div>
  );
}

function SalaryBox({ a, b }: PairProps) {
  const valueA = a.salary?.averageAnnualUsd ?? null;
  const valueB = b.salary?.averageAnnualUsd ?? null;
  const longest = Math.max(valueA ?? 0, valueB ?? 0);

  return (
    <Box title="Salary">
      <Columns a={a} b={b}>
        {valueA !== null ? (
          <span className={profile.salaryValue}>
            <Dot side="a" />
            {formatUsd(valueA)}
          </span>
        ) : (
          <NotPublished />
        )}
        {valueB !== null ? (
          <span className={profile.salaryValue}>
            <Dot side="b" />
            {formatUsd(valueB)}
          </span>
        ) : (
          <NotPublished />
        )}
      </Columns>

      {longest > 0 ? (
        // Decorative: both numbers are written out above.
        <div className={profile.compareBars} aria-hidden="true">
          {valueA !== null ? (
            <span
              className={profile.compareBar}
              style={{ width: `${(valueA / longest) * 100}%`, backgroundColor: SIDE_COLORS.a }}
            />
          ) : null}
          {valueB !== null ? (
            <span
              className={profile.compareBar}
              style={{ width: `${(valueB / longest) * 100}%`, backgroundColor: SIDE_COLORS.b }}
            />
          ) : null}
        </div>
      ) : null}

      {/* The two figures may cover different roles, so say what each one is. */}
      <ul className={styles.sources}>
        {[a, b].map((company) =>
          company.salary ? (
            <li key={company.id}>
              {company.name}: {company.salary.basis} (average) ·{' '}
              <a href={company.salary.sourceUrl} target="_blank" rel="noreferrer">
                source
              </a>
            </li>
          ) : null,
        )}
      </ul>
    </Box>
  );
}

function PromotionBox({ a, b }: PairProps) {
  return (
    <Box title="Women promotion rate">
      <PercentRows
        a={a}
        b={b}
        valueA={a.promotion?.womenPromotionRatePct ?? null}
        valueB={b.promotion?.womenPromotionRatePct ?? null}
      />
      <h3 className={styles.subheading}>Women in management</h3>
      <PercentRows
        a={a}
        b={b}
        valueA={a.promotion?.womenInManagementPct ?? null}
        valueB={b.promotion?.womenInManagementPct ?? null}
      />
    </Box>
  );
}

function WorkforceBox({ a, b }: PairProps) {
  return (
    <Box title="Women in workforce">
      <PercentRows
        a={a}
        b={b}
        valueA={a.womenSupport?.womenWorkforcePct ?? null}
        valueB={b.womenSupport?.womenWorkforcePct ?? null}
      />
    </Box>
  );
}

function weeks(company: CompanyRecord) {
  const policy = company.paidMaternityLeave;
  if (policy?.paidWeeks == null) {
    return (
      <span className={`${profile.salaryMissing} ${profile.weeksMissing}`}>Not published</span>
    );
  }
  return (
    <span className={styles.weeks}>
      <span className={profile.weeksValue}>{Number(policy.paidWeeks.toFixed(1))}wk</span>
      {policy.payPercent !== null ? (
        <span className={styles.pay}>at {policy.payPercent}% pay</span>
      ) : null}
    </span>
  );
}

function MaternityBox({ a, b }: PairProps) {
  return (
    <Box title="Paid maternity leave" short>
      <Columns a={a} b={b}>
        {weeks(a)}
        {weeks(b)}
      </Columns>
    </Box>
  );
}

function BenefitsBox({ a, b }: PairProps) {
  return (
    <Box title="Welfare benefits" short>
      {[
        { company: a, pill: profile.pillPublic },
        { company: b, pill: styles.pillB },
      ].map(({ company, pill }) => (
        <div key={company.id} className={styles.benefits}>
          <span className={styles.columnName}>{company.name}</span>
          {company.benefits.length > 0 ? (
            <ul className={profile.pills} aria-label={`${company.name} benefits`}>
              {company.benefits.map((benefit) => (
                <li key={benefit} className={`${profile.pill} ${pill}`}>
                  {benefit}
                </li>
              ))}
            </ul>
          ) : (
            <p className={`${profile.footnote} ${profile.pillsMissing}`}>None published</p>
          )}
        </div>
      ))}
    </Box>
  );
}

export function CompareBoxes({ a, b }: PairProps) {
  return (
    <div className={`${profile.grid} ${styles.grid}`}>
      <SalaryBox a={a} b={b} />
      <PromotionBox a={a} b={b} />
      <WorkforceBox a={a} b={b} />
      <MaternityBox a={a} b={b} />
      <BenefitsBox a={a} b={b} />
    </div>
  );
}
