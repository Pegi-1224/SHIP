import type { CompanyRecord } from '@/shared/types/demoSearch';
import { compareRecords, leadText } from '../../utils/recordComparison';
import styles from './compare.module.css';

/** The purple summary: who leads where, then one pill per company that leads somewhere. */
export function CompareSummary({ a, b }: { a: CompanyRecord; b: CompanyRecord }) {
  const result = compareRecords(a, b);
  const pills = [
    result.leadsA.length > 0 ? leadText(a.name, result.leadsA, result.compared) : null,
    result.leadsB.length > 0 ? leadText(b.name, result.leadsB, result.compared) : null,
  ].filter((text): text is string => text !== null);

  return (
    <section className={styles.summary} aria-labelledby="compare-summary">
      <h2 id="compare-summary" className={styles.summaryLabel}>
        Summary
      </h2>
      <p className={styles.summaryText}>{result.sentences.join(' ')}</p>
      <ul className={styles.leads}>
        {pills.length > 0 ? (
          pills.map((text) => (
            <li key={text} className={styles.lead}>
              {text}
            </li>
          ))
        ) : (
          <li className={styles.lead}>Neither company leads in the areas we could compare</li>
        )}
      </ul>
    </section>
  );
}
