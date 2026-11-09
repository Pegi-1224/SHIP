import { UserAvatar } from '@/shared/ui';
import styles from './FeatureTourDemos.module.css';

/*
 * The illustrations on the left of the feature tour (UI design, Nov 2026). Every company, number
 * and post here is made up, and the tour says so under each one: they show what the real pages
 * look like, not real data.
 */

/** A bar that fills `percent` of its track. `label` reads the value out when it is not shown. */
function Bar({ percent, label }: { percent: number; label?: string }) {
  return (
    <span className={styles.track}>
      <span className={styles.fill} style={{ width: `${percent}%` }} aria-hidden="true" />
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

const SIDES = {
  a: { name: 'Brightfern Health', color: '#5b2acf' },
  b: { name: 'Lumen Harbor Analytics', color: '#659aff' },
} as const;

/** One area each: the two values, and which side leads. `accent` colours the leading value. */
const COMPARE_ROWS = [
  { label: 'Salary', a: '$141k', b: '$128k', leader: 'a' },
  { label: 'Promotion rate', a: '52%', b: '40%', leader: 'a' },
  { label: 'Women in workforce', a: '63%', b: '44%', leader: 'a' },
  { label: 'Maternity leave', a: '20 wk', b: '16 wk', leader: 'a', accent: true },
  { label: 'Benefits', a: '4 items', b: '5 items', leader: 'b', accent: true },
] as const;

/** Feature 2: two companies side by side, as the compare page sums them up. */
export function CompareDemo({ note }: { note: string }) {
  return (
    <div className={styles.compare}>
      <p className={styles.versus}>
        <span className={styles.side}>
          <span className={styles.sideDot} style={{ backgroundColor: SIDES.a.color }} />
          {SIDES.a.name}
        </span>
        <span className={styles.vs}>VS</span>
        <span className={styles.side}>
          <span className={styles.sideDot} style={{ backgroundColor: SIDES.b.color }} />
          {SIDES.b.name}
        </span>
      </p>

      <div className={styles.summary}>
        <p className={styles.summaryLabel}>Summary</p>
        <p className={styles.summaryText}>
          Brightfern Health offers 4 more weeks of paid maternity leave and has 19 percentage points
          more women in its workforce.
        </p>
        <p className={styles.summaryLead}>Brightfern Health leads in 4 of 5 areas</p>
      </div>

      <dl className={styles.areas}>
        {COMPARE_ROWS.map((row) => (
          <div key={row.label} className={styles.area}>
            <dt className={styles.areaLabel}>{row.label}</dt>
            {(['a', 'b'] as const).map((side) => (
              <dd
                key={side}
                className={
                  row.leader !== side
                    ? styles.areaValue
                    : `${styles.areaValue} ${'accent' in row ? styles.leadAccent : styles.lead}`
                }
              >
                <span className="ship-visually-hidden">{SIDES[side].name}: </span>
                {row[side]}
              </dd>
            ))}
            <dd className={styles.areaLeader}>
              <span
                className={styles.leaderDot}
                style={{ backgroundColor: SIDES[row.leader].color }}
                aria-hidden="true"
              />
              <span className="ship-visually-hidden">{SIDES[row.leader].name} leads</span>
            </dd>
          </div>
        ))}
      </dl>

      <div className={styles.compareFooter}>
        <span className={`${styles.key} ${styles.keyPublic}`}>Public data</span>
        <span className={`${styles.key} ${styles.keyUser}`}>User reported</span>
        <p className={styles.compareNote}>{note}</p>
      </div>
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
