import { Link } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import { paths } from '@/shared/config/paths';
import styles from './CompanyNotFound.module.css';

/**
 * Shown when the header's company search finds nothing: says the company is
 * missing and offers to add it, with the searched name pre-filled
 * (`/companies/new?name=`).
 */
export function CompanyNotFound({ name }: { name: string }) {
  return (
    <section className={styles.page} aria-labelledby="company-not-found-title">
      <div className={styles.icon} aria-hidden="true">
        <Building2 size={54} strokeWidth={2.16} absoluteStrokeWidth />
      </div>
      <h2 id="company-not-found-title" className={styles.title}>
        We don’t have this company yet.
      </h2>
      <p className={styles.text}>
        Add “{name}” and be the first to share what it’s really like to work there.
      </p>
      <Link to={paths.companyNewWithName(name)} className={styles.button}>
        Add this company
      </Link>
    </section>
  );
}
