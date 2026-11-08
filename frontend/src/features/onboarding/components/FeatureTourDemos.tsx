import { UserAvatar } from '@/shared/ui';
import styles from './FeatureTourDemos.module.css';

/*
 * The illustrations on the left of the feature tour (UI design, Nov 2026). Every company, number
 * and post here is made up, and the tour says so under each one: they show what the real pages
 * look like, not real data.
 */

/** A bar that fills `percent` of its track. `label` reads the value out when it is not shown. */
function Bar({ percent, label, color }: { percent: number; label?: string; color?: string }) {
  return (
    <span className={styles.track}>
      <span
        className={styles.fill}
        style={{ width: `${percent}%`, backgroundColor: color }}
        aria-hidden="true"
      />
      {label ? <span className="ship-visually-hidden">{label}</span> : null}
    </span>
  );
}

const COMPANY_ROWS = [
  { label: 'Average salary', percent: 81.6, value: '$150k' },
  { label: '% Women in leadership roles', percent: 46, value: '46%' },
  { label: 'Promotion rate', percent: 62, value: '62% a year' },
] as const;

/** Feature 1: one company's figures. */
export function CompanyDemo() {
  return (
    <div className={styles.card}>
      <div className={styles.company}>
        <span className={styles.logo} aria-hidden="true">
          N
        </span>
        <div>
          <p className={styles.companyName}>Northwind</p>
          <p className={styles.companyMeta}>Tech · Seattle</p>
        </div>
      </div>

      <dl className={styles.figures}>
        {COMPANY_ROWS.map((row) => (
          <div key={row.label} className={styles.figure}>
            <dt className={styles.figureLabel}>{row.label}</dt>
            <dd className={styles.figureValue}>
              <Bar percent={row.percent} label={row.value} />
            </dd>
          </div>
        ))}
        <div className={styles.figure}>
          <dt className={styles.figureLabel}>Welfare benefits</dt>
          <dd className={styles.figureValue}>
            <ul className={styles.benefits}>
              <li className={styles.benefit}>Paid Maternity Leave 14 weeks</li>
              <li className={styles.benefit}>Childcare stipend</li>
            </ul>
          </dd>
        </div>
      </dl>
    </div>
  );
}

const NORTHWIND_COLOR = '#5b2acf';
const LUMEN_COLOR = '#659aff';

const COMPARISONS = [
  {
    title: 'Paid maternity leave',
    // Bars are drawn against a fixed scale so the two companies can be compared at a glance.
    scale: 58,
    rows: [
      { name: 'Northwind', amount: 16, value: '16 wk', color: NORTHWIND_COLOR },
      { name: 'Lumen Labs', amount: 20, value: '20 wk', color: LUMEN_COLOR },
    ],
  },
  {
    title: 'Salary',
    scale: 240,
    rows: [
      { name: 'Northwind', amount: 150, value: '$150k', color: NORTHWIND_COLOR },
      { name: 'Lumen Labs', amount: 134, value: '$134k', color: LUMEN_COLOR },
    ],
  },
] as const;

/** Feature 2: two companies side by side. */
export function CompareDemo() {
  return (
    <div className={styles.stack}>
      {COMPARISONS.map((comparison) => (
        <div key={comparison.title} className={`${styles.card} ${styles.compareCard}`}>
          <div className={styles.compareHeader}>
            <p className={styles.compareTitle}>{comparison.title}</p>
            <p className={styles.source}>Public data</p>
          </div>
          <dl className={styles.compareRows}>
            {comparison.rows.map((row) => (
              <div key={row.name} className={styles.compareRow}>
                <dt className={styles.compareName}>{row.name}</dt>
                <dd className={styles.compareBar}>
                  <Bar percent={(row.amount / comparison.scale) * 100} color={row.color} />
                </dd>
                <dd className={styles.compareValue}>{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  );
}

/** Feature 3: a discussion post, as the discussion list shows it. */
export function DiscussionDemo() {
  return (
    <div className={`${styles.card} ${styles.post}`}>
      <div className={styles.postMeta}>
        <UserAvatar name="Anonymous" avatarUrl={null} seed="tour-anonymous" size={39.6} />
        <span className={styles.byline}>Anonymous · 2h ago</span>
      </div>
      <p className={styles.postTitle}>How did you guys land your first leadership role?</p>
      <p className={styles.postBody}>
        I’m hoping to transition into a management role within the next year, but I’m not sure how
        to get my foot in the door...
      </p>
      <div className={styles.postFooter}>
        <span className={styles.tag}>#negotiation</span>
        <span className={styles.comments}>8 comments</span>
      </div>
    </div>
  );
}
