/**
 * The metric boxes on the company page. Each box keeps public data and
 * user-reported data visibly apart (spec 3.5, AC-5) and has a clear state for
 * every combination of "published or not" and "reported or not". When there
 * are no user reports to show, the user-reported part becomes a "Be the first"
 * box that opens the report form.
 */
import type { CSSProperties, ReactNode } from 'react';
import { MIN_ELIGIBLE_CONTRIBUTORS } from '@/shared/config/constants';
import type { CompanyRecord } from '@/shared/types/demoSearch';
import type { DemoReportArea } from '@/shared/utils/demoReports';
import { formatPercent, formatUsd, NOT_REPORTED } from '@/shared/utils/format';
import styles from './profile.module.css';

/** Width of the salary comparison bar at its longest (design: 316.8px). */
const COMPARE_BAR_MAX = '316.8px';

/** Whether a user-reported area has numbers to show. */
type ReportState = 'none' | 'few' | 'shown';

function reportState(area: { submissions: number } | null): ReportState {
  if (!area || area.submissions === 0) return 'none';
  return area.submissions < MIN_ELIGIBLE_CONTRIBUTORS ? 'few' : 'shown';
}

function submissionsText(prefix: string, submissions: number): string {
  return `${prefix} from ${submissions} ${submissions === 1 ? 'submission' : 'submissions'}`;
}

interface BoxProps {
  company: CompanyRecord;
  /** Opens the report form for this box's area. */
  onReport: (area: DemoReportArea) => void;
}

function SourceLink({ url, children }: { url: string; children: ReactNode }) {
  return (
    <a href={url} target="_blank" rel="noreferrer">
      {children}
    </a>
  );
}

interface MetricBoxProps {
  title: string;
  /** Second-row boxes are shorter (design: 306px instead of 387px). */
  short?: boolean;
  /** Pinned to the bottom of the box: where the public figures come from. */
  source?: ReactNode;
  children: ReactNode;
}

function MetricBox({ title, short = false, source, children }: MetricBoxProps) {
  return (
    <section className={`${styles.box} ${short ? styles.boxShort : ''}`} aria-label={title}>
      <h2 className={styles.boxTitle}>{title}</h2>
      <div className={styles.boxBody}>
        {children}
        {source ? <p className={styles.source}>{source}</p> : null}
      </div>
    </section>
  );
}

interface NoReportsBoxProps {
  state: Exclude<ReportState, 'shown'>;
  submissions: number;
  boxTitle: string;
  onClick: () => void;
}

/**
 * Stands in for the user-reported part of a box: "No data yet / Be the first",
 * or, below the privacy threshold, "Not enough data yet / Add yours".
 */
function NoReportsBox({ state, submissions, boxTitle, onClick }: NoReportsBoxProps) {
  const label = state === 'none' ? 'Be the first' : 'Add yours';
  return (
    <>
      <div className={styles.noReports}>
        <div className={styles.noReportsText}>
          <span className={styles.noReportsLabel}>User reported</span>
          <span className={styles.noReportsTitle}>
            {state === 'none' ? 'No data yet' : 'Not enough data yet'}
          </span>
        </div>
        <button
          type="button"
          className={styles.reportButton}
          onClick={onClick}
          aria-label={`${label} to report ${boxTitle.toLowerCase()}`}
        >
          {label}
        </button>
      </div>
      {state === 'few' ? (
        <p className={`${styles.footnote} ${styles.noReportsNote}`}>
          Numbers show once {MIN_ELIGIBLE_CONTRIBUTORS} people report ({submissions} so far).
        </p>
      ) : null}
    </>
  );
}

interface UserReportedProps {
  area: { submissions: number } | null;
  boxTitle: string;
  /** Footnote prefix: "{prefix} from N submissions". */
  footnote: string;
  onClick: () => void;
  children?: ReactNode;
}

/** The user-reported part of a box: `children` and a footnote, or the "Be the first" box. */
function UserReported({ area, boxTitle, footnote, onClick, children }: UserReportedProps) {
  const state = reportState(area);
  if (state !== 'shown') {
    return (
      <NoReportsBox
        state={state}
        submissions={area?.submissions ?? 0}
        boxTitle={boxTitle}
        onClick={onClick}
      />
    );
  }
  return (
    <>
      {children}
      <div className={styles.footnoteRow}>
        <p className={styles.footnote}>{submissionsText(footnote, area?.submissions ?? 0)}</p>
        <button
          type="button"
          className={styles.addReport}
          onClick={onClick}
          aria-label={`Add yours to ${boxTitle.toLowerCase()}`}
        >
          Add yours
        </button>
      </div>
    </>
  );
}

interface PercentRowProps {
  label: string;
  value: number | null;
  /** Width of the grey track; the purple fill covers `value`% of it. */
  trackWidth?: string;
}

/** "Women promotion rate  [====    ]  40%". `null` shows an empty track and a dash. */
function PercentRow({ label, value, trackWidth = '57.6px' }: PercentRowProps) {
  const clamped = value === null ? 0 : Math.min(Math.max(value, 0), 100);
  return (
    <div className={styles.percentRow} style={{ '--track-width': trackWidth } as CSSProperties}>
      <span className={styles.percentLabel}>{label}</span>
      <span className={styles.track} aria-hidden="true">
        <span className={styles.fill} style={{ display: 'block', width: `${clamped}%` }} />
      </span>
      <span className={styles.percentValue}>{formatPercent(value)}</span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

export function SalaryBox({ company, onReport }: BoxProps) {
  const publicSalary = company.salary;
  const reported = company.userReported.salary;
  const publicValue = publicSalary?.averageAnnualUsd ?? null;
  const userValue = reported?.averageAnnualUsd ?? null;
  const longest = Math.max(publicValue ?? 0, userValue ?? 0);

  return (
    <MetricBox
      title="Salary"
      source={
        publicSalary ? (
          <>
            Public: {publicSalary.basis} (average) ·{' '}
            <SourceLink url={publicSalary.sourceUrl}>source</SourceLink>
            {userValue !== null ? (
              <>
                <br />
                User reported: average annual base salary
              </>
            ) : null}
          </>
        ) : userValue !== null ? (
          'User reported: average annual base salary'
        ) : null
      }
    >
      <div className={styles.salaryColumns}>
        <span className={styles.sourceLabel}>Public data</span>
        <span className={styles.sourceLabel}>User reported</span>
        {publicValue !== null ? (
          <span className={styles.salaryValue}>
            <span className={`${styles.dot} ${styles.dotPublic}`} aria-hidden="true" />
            {formatUsd(publicValue)}
          </span>
        ) : (
          <span className={styles.salaryMissing}>Not published</span>
        )}
        {userValue !== null ? (
          <span className={styles.salaryValue}>
            <span className={`${styles.dot} ${styles.dotUser}`} aria-hidden="true" />
            {formatUsd(userValue)}
          </span>
        ) : (
          <span className={styles.salaryMissing}>{NOT_REPORTED}</span>
        )}
      </div>

      {longest > 0 ? (
        // Decorative: both numbers are already written out above.
        <div
          className={styles.compareBars}
          style={{ maxWidth: COMPARE_BAR_MAX }}
          aria-hidden="true"
        >
          {publicValue !== null ? (
            <span
              className={`${styles.compareBar} ${styles.compareBarPublic}`}
              style={{ width: `${(publicValue / longest) * 100}%` }}
            />
          ) : null}
          {userValue !== null ? (
            <span
              className={`${styles.compareBar} ${styles.compareBarUser}`}
              style={{ width: `${(userValue / longest) * 100}%` }}
            />
          ) : null}
        </div>
      ) : (
        <p className={`${styles.footnote} ${styles.salaryNote}`}>
          No salary figures to compare yet.
        </p>
      )}

      <UserReported
        area={reported}
        boxTitle="Salary"
        footnote="User reported"
        onClick={() => onReport('salary')}
      />
    </MetricBox>
  );
}

export function PromotionBox({ company, onReport }: BoxProps) {
  const publicPromotion = company.promotion;
  const reported = company.userReported.promotion;
  const months = reported?.avgMonthsToPromotion ?? null;

  return (
    <MetricBox
      title="Promotion & leadership"
      source={
        publicPromotion ? (
          <>
            Rates: public data · <SourceLink url={publicPromotion.sourceUrl}>source</SourceLink>
          </>
        ) : (
          'No public promotion data yet'
        )
      }
    >
      <div className={styles.percentRows}>
        <PercentRow
          label="Women promotion rate"
          value={publicPromotion?.womenPromotionRatePct ?? null}
        />
        <PercentRow
          label="Women in management"
          value={publicPromotion?.womenInManagementPct ?? null}
        />
      </div>

      <UserReported
        area={reported}
        boxTitle="Promotion & leadership"
        footnote="Time to promotion"
        onClick={() => onReport('promotion')}
      >
        <div className={styles.highlight}>
          <span className={styles.highlightLabel}>Avg. time to promotion</span>
          <span className={styles.highlightValue}>
            {months === null ? NOT_REPORTED : `${Math.round(months)} mo`}
          </span>
        </div>
      </UserReported>
    </MetricBox>
  );
}

export function DiversityBox({ company, onReport }: BoxProps) {
  const reported = company.userReported.diversity;
  const tiles: Array<[string, number | null]> = [
    ['Have a woman manager', reported?.womanManagerPct ?? null],
    ['Report a woman in C-suite', reported?.womanInCSuitePct ?? null],
    ['Women on their team', reported?.womenOnTeamPct ?? null],
    ['Feel included at work', reported?.feelIncludedPct ?? null],
  ];

  return (
    <MetricBox
      title="Women support & diversity"
      source={
        (company.womenSupport?.womenWorkforcePct ?? null) !== null
          ? 'Women in workforce: public data (see sources below)'
          : 'No public workforce data yet'
      }
    >
      <PercentRow
        label="Women in workforce"
        value={company.womenSupport?.womenWorkforcePct ?? null}
        trackWidth="64.8px"
      />

      <UserReported
        area={reported}
        boxTitle="Women support & diversity"
        footnote="User reported"
        onClick={() => onReport('diversity')}
      >
        <div className={styles.tiles}>
          {tiles.map(([label, value]) => (
            <div key={label} className={styles.tile}>
              <span className={styles.tileValue}>{formatPercent(value)}</span>
              <span className={styles.tileLabel}>{label}</span>
            </div>
          ))}
        </div>
      </UserReported>
    </MetricBox>
  );
}

/** `16wk`, keeping one decimal for averages such as `15.5wk`. */
function formatWeeksShort(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return NOT_REPORTED;
  return `${Number(value.toFixed(1))}wk`;
}

export function MaternityBox({ company, onReport }: BoxProps) {
  const policy = company.paidMaternityLeave;
  const reported = company.userReported.maternity;
  const publicWeeks = policy?.paidWeeks ?? null;

  return (
    <MetricBox
      title="Paid maternity leave"
      short
      source={
        policy ? (
          <>
            Public policy
            {policy.payPercent !== null ? `: ${policy.payPercent}% pay` : ''}
            {policy.notes ? ` · ${policy.notes}` : ''}
          </>
        ) : (
          'No public leave policy found'
        )
      }
    >
      <div className={styles.salaryColumns}>
        <span className={styles.sourceLabel}>Public policy</span>
        <span className={styles.sourceLabel}>User reported</span>
        {publicWeeks !== null ? (
          <span className={styles.weeksValue}>{formatWeeksShort(publicWeeks)}</span>
        ) : (
          <span className={`${styles.salaryMissing} ${styles.weeksMissing}`}>Not published</span>
        )}
        <span className={styles.weeksValue}>
          {formatWeeksShort(reported?.avgPaidWeeks ?? null)}
        </span>
      </div>

      <UserReported
        area={reported}
        boxTitle="Paid maternity leave"
        footnote="User reported"
        onClick={() => onReport('maternity')}
      >
        <div className={styles.payBox}>
          <span className={styles.highlightLabel}>Pay during leave</span>
          <span className={styles.payValue}>{formatPercent(reported?.avgPayPercent ?? null)}</span>
        </div>
      </UserReported>
    </MetricBox>
  );
}

export function BenefitsBox({ company, onReport }: BoxProps) {
  const reported = company.userReported.benefits;

  return (
    <MetricBox title="Welfare benefits" short>
      <span className={styles.sourceLabel}>Public data</span>
      {company.benefits.length > 0 ? (
        <ul className={styles.pills} aria-label="Public benefits">
          {company.benefits.map((benefit) => (
            <li key={benefit} className={`${styles.pill} ${styles.pillPublic}`}>
              {benefit}
            </li>
          ))}
        </ul>
      ) : (
        <p className={`${styles.footnote} ${styles.pillsMissing}`}>None published</p>
      )}

      <UserReported
        area={reported}
        boxTitle="Welfare benefits"
        footnote="User reported"
        onClick={() => onReport('benefits')}
      >
        <span className={styles.sourceLabel}>User reported</span>
        <ul className={styles.pills} aria-label="User-reported benefits">
          {(reported?.items ?? []).map((item) => (
            <li
              key={item.name}
              className={`${styles.pill} ${styles.pillUser}`}
              title={`Mentioned in ${item.reports} of ${reported?.submissions ?? 0} reports`}
            >
              {item.name}
            </li>
          ))}
        </ul>
      </UserReported>
    </MetricBox>
  );
}
