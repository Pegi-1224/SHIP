/**
 * The comparison page's metric boxes: the company page's five boxes, with the second company in
 * place of the user-reported column (UI design, Nov 2026). Each box has its own switch under the
 * title between public data and user reports, so the two kinds of data are never mixed in one view
 * (spec 3.5, AC-5).
 */
import { useState, type ReactNode } from 'react';
import { MIN_ELIGIBLE_CONTRIBUTORS } from '@/shared/config/constants';
import type { CompanyRecord } from '@/shared/types/demoSearch';
import { formatPercent, formatUsd } from '@/shared/utils/format';
import profile from '../profile/profile.module.css';
import styles from './compare.module.css';
import { SIDE_COLORS } from './sideColors';

interface PairProps {
  a: CompanyRecord;
  b: CompanyRecord;
}

type View = 'public' | 'user';

const VIEWS: Array<{ view: View; label: string }> = [
  { view: 'public', label: 'Public data' },
  { view: 'user', label: 'User reported' },
];

function Box({
  title,
  short,
  children,
}: {
  title: string;
  short?: boolean;
  children: (view: View) => ReactNode;
}) {
  const [view, setView] = useState<View>('public');
  return (
    <section
      className={`${profile.box} ${short ? profile.boxShort : ''} ${styles.box}`}
      aria-label={title}
    >
      <h2 className={`${profile.boxTitle} ${styles.boxTitle}`}>{title}</h2>
      <div className={styles.views} role="group" aria-label={`${title}: data shown`}>
        {VIEWS.map((option) => (
          <button
            key={option.view}
            type="button"
            className={styles.viewButton}
            aria-pressed={view === option.view}
            onClick={() => setView(option.view)}
          >
            {option.label}
          </button>
        ))}
      </div>
      <div className={profile.boxBody}>{children(view)}</div>
    </section>
  );
}

/* ---- User reports ---- */

/** Numbers are withheld until enough people report (spec 3.5, AC-6). */
type ReportState = 'none' | 'few' | 'shown';

function reportState(area: { submissions: number } | null): ReportState {
  if (!area || area.submissions === 0) return 'none';
  return area.submissions < MIN_ELIGIBLE_CONTRIBUTORS ? 'few' : 'shown';
}

/** What a company's slot says when it has no user-reported number to show. */
function noReportsText(area: { submissions: number } | null): string {
  const state = reportState(area);
  if (state === 'none') return 'No reports yet';
  return state === 'few' ? 'Not enough reports yet' : 'Not reported';
}

/** "Brightfern Health: from 15 submissions", one line per company, under a user-reported view. */
function ReportCounts({
  a,
  b,
  areaOf,
}: PairProps & { areaOf: (company: CompanyRecord) => { submissions: number } | null }) {
  return (
    <ul className={styles.sources}>
      {[a, b].map((company) => {
        const area = areaOf(company);
        const submissions = area?.submissions ?? 0;
        const state = reportState(area);
        return (
          <li key={company.id}>
            {company.name}:{' '}
            {state === 'none'
              ? 'no reports yet'
              : state === 'few'
                ? `numbers show once ${MIN_ELIGIBLE_CONTRIBUTORS} people report (${submissions} so far)`
                : `from ${submissions} ${submissions === 1 ? 'submission' : 'submissions'}`}
          </li>
        );
      })}
    </ul>
  );
}

/* ---- Shared pieces ---- */

function Dot({ side }: { side: 'a' | 'b' }) {
  return (
    <span
      className={profile.dot}
      style={{ backgroundColor: SIDE_COLORS[side] }}
      aria-hidden="true"
    />
  );
}

function Missing({ children }: { children: ReactNode }) {
  return <span className={profile.salaryMissing}>{children}</span>;
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

/* ---- Boxes ---- */

function SalaryFigures({
  a,
  b,
  valueA,
  valueB,
  missingA,
  missingB,
}: PairProps & {
  valueA: number | null;
  valueB: number | null;
  missingA: string;
  missingB: string;
}) {
  const longest = Math.max(valueA ?? 0, valueB ?? 0);
  return (
    <>
      <Columns a={a} b={b}>
        {valueA !== null ? (
          <span className={profile.salaryValue}>
            <Dot side="a" />
            {formatUsd(valueA)}
          </span>
        ) : (
          <Missing>{missingA}</Missing>
        )}
        {valueB !== null ? (
          <span className={profile.salaryValue}>
            <Dot side="b" />
            {formatUsd(valueB)}
          </span>
        ) : (
          <Missing>{missingB}</Missing>
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
    </>
  );
}

function SalaryBox({ a, b }: PairProps) {
  return (
    <Box title="Salary">
      {(view) =>
        view === 'public' ? (
          <>
            <SalaryFigures
              a={a}
              b={b}
              valueA={a.salary?.averageAnnualUsd ?? null}
              valueB={b.salary?.averageAnnualUsd ?? null}
              missingA="Not published"
              missingB="Not published"
            />
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
          </>
        ) : (
          <>
            <p className={styles.viewNote}>Average annual base salary</p>
            <SalaryFigures
              a={a}
              b={b}
              valueA={a.userReported.salary?.averageAnnualUsd ?? null}
              valueB={b.userReported.salary?.averageAnnualUsd ?? null}
              missingA={noReportsText(a.userReported.salary)}
              missingB={noReportsText(b.userReported.salary)}
            />
            <ReportCounts a={a} b={b} areaOf={(company) => company.userReported.salary} />
          </>
        )
      }
    </Box>
  );
}

function months(company: CompanyRecord) {
  const area = company.userReported.promotion;
  const value = area?.avgMonthsToPromotion ?? null;
  if (value === null) return <Missing>{noReportsText(area)}</Missing>;
  return <span className={profile.salaryValue}>{Math.round(value)} mo</span>;
}

function PromotionBox({ a, b }: PairProps) {
  return (
    <Box title="Women promotion rate">
      {(view) =>
        view === 'public' ? (
          <>
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
          </>
        ) : (
          <>
            <p className={styles.viewNote}>Average time to promotion</p>
            <Columns a={a} b={b}>
              {months(a)}
              {months(b)}
            </Columns>
            <ReportCounts a={a} b={b} areaOf={(company) => company.userReported.promotion} />
          </>
        )
      }
    </Box>
  );
}

function WorkforceBox({ a, b }: PairProps) {
  return (
    <Box title="Women in workforce">
      {(view) =>
        view === 'public' ? (
          <PercentRows
            a={a}
            b={b}
            valueA={a.womenSupport?.womenWorkforcePct ?? null}
            valueB={b.womenSupport?.womenWorkforcePct ?? null}
          />
        ) : (
          <>
            {/* The nearest user-reported figures: who people work with day to day. */}
            <h3 className={styles.subheading}>Women on their team</h3>
            <PercentRows
              a={a}
              b={b}
              valueA={a.userReported.diversity?.womenOnTeamPct ?? null}
              valueB={b.userReported.diversity?.womenOnTeamPct ?? null}
            />
            <h3 className={styles.subheading}>Have a woman manager</h3>
            <PercentRows
              a={a}
              b={b}
              valueA={a.userReported.diversity?.womanManagerPct ?? null}
              valueB={b.userReported.diversity?.womanManagerPct ?? null}
            />
            <ReportCounts a={a} b={b} areaOf={(company) => company.userReported.diversity} />
          </>
        )
      }
    </Box>
  );
}

function weeks(paidWeeks: number | null, payPercent: number | null, missing: string) {
  if (paidWeeks === null) {
    return <span className={`${profile.salaryMissing} ${profile.weeksMissing}`}>{missing}</span>;
  }
  return (
    <span className={styles.weeks}>
      <span className={profile.weeksValue}>{Number(paidWeeks.toFixed(1))}wk</span>
      {payPercent !== null ? <span className={styles.pay}>at {payPercent}% pay</span> : null}
    </span>
  );
}

function publicWeeks(company: CompanyRecord) {
  const policy = company.paidMaternityLeave;
  return weeks(policy?.paidWeeks ?? null, policy?.payPercent ?? null, 'Not published');
}

function reportedWeeks(company: CompanyRecord) {
  const area = company.userReported.maternity;
  return weeks(
    area?.avgPaidWeeks ?? null,
    area?.avgPayPercent === null || area?.avgPayPercent === undefined
      ? null
      : Math.round(area.avgPayPercent),
    noReportsText(area),
  );
}

function MaternityBox({ a, b }: PairProps) {
  return (
    <Box title="Paid maternity leave" short>
      {(view) =>
        view === 'public' ? (
          <Columns a={a} b={b}>
            {publicWeeks(a)}
            {publicWeeks(b)}
          </Columns>
        ) : (
          <>
            <Columns a={a} b={b}>
              {reportedWeeks(a)}
              {reportedWeeks(b)}
            </Columns>
            <ReportCounts a={a} b={b} areaOf={(company) => company.userReported.maternity} />
          </>
        )
      }
    </Box>
  );
}

function BenefitList({
  company,
  pill,
  items,
  missing,
}: {
  company: CompanyRecord;
  pill: string | undefined;
  items: string[];
  missing: string;
}) {
  return (
    <div className={styles.benefits}>
      <span className={styles.columnName}>{company.name}</span>
      {items.length > 0 ? (
        <ul className={profile.pills} aria-label={`${company.name} benefits`}>
          {items.map((benefit) => (
            <li key={benefit} className={`${profile.pill} ${pill}`}>
              {benefit}
            </li>
          ))}
        </ul>
      ) : (
        <p className={`${profile.footnote} ${profile.pillsMissing}`}>{missing}</p>
      )}
    </div>
  );
}

function BenefitsBox({ a, b }: PairProps) {
  const sides = [
    { company: a, pill: profile.pillPublic },
    { company: b, pill: styles.pillB },
  ];
  return (
    <Box title="Welfare benefits" short>
      {(view) =>
        view === 'public' ? (
          sides.map(({ company, pill }) => (
            <BenefitList
              key={company.id}
              company={company}
              pill={pill}
              items={company.benefits}
              missing="None published"
            />
          ))
        ) : (
          <>
            {sides.map(({ company, pill }) => {
              const area = company.userReported.benefits;
              return (
                <BenefitList
                  key={company.id}
                  company={company}
                  pill={pill}
                  items={(area?.items ?? []).map((item) => item.name)}
                  missing={noReportsText(area)}
                />
              );
            })}
            <ReportCounts a={a} b={b} areaOf={(company) => company.userReported.benefits} />
          </>
        )
      }
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
