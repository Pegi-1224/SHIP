import type { ReactNode } from 'react';
import type { CompanyRecord } from '@/shared/types/demoSearch';
import { formatDay, VERIFICATION_BADGE } from './format';
import styles from './profile.module.css';

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h3 className={styles.detailsHeading}>{title}</h3>
      {children}
    </div>
  );
}

/** Contact information, sources and the verification result, below the metric boxes. */
export function CompanyDetails({ company }: { company: CompanyRecord }) {
  const { verification } = company;

  return (
    <section className={styles.details} aria-labelledby="company-details-heading">
      <h2 id="company-details-heading" className={styles.boxTitle}>
        Company details
      </h2>
      <div className={styles.detailsGrid}>
        <Block title="Contact">
          <p className={styles.detailsText}>
            {company.address}
            <br />
            <a href={`mailto:${company.email}`}>{company.email}</a>
            <br />
            {company.phone}
          </p>
        </Block>

        <Block title="Contact list">
          <ul className={styles.detailsList}>
            {company.contacts.map((contact) => (
              <li key={contact.email}>
                {contact.name} ({contact.role}) -{' '}
                <a href={`mailto:${contact.email}`}>{contact.email}</a>
              </li>
            ))}
          </ul>
        </Block>

        <Block title="Sources">
          <ul className={styles.detailsList}>
            {company.sources.map((source) => (
              <li key={source.url}>
                <a href={source.url} target="_blank" rel="noreferrer">
                  {source.label}
                </a>
              </li>
            ))}
          </ul>
        </Block>

        <Block title="Verification">
          <p className={styles.detailsText}>
            {VERIFICATION_BADGE[verification.status].label}
            {verification.checkedAt ? ` on ${formatDay(verification.checkedAt)}` : ''}
            {verification.confidence !== null
              ? ` (confidence ${Math.round(verification.confidence * 100)}%)`
              : ''}
            . Data collected {formatDay(company.dataCollectedAt)}.
          </p>
          {verification.notes ? <p className={styles.detailsText}>{verification.notes}</p> : null}
        </Block>

        <Block title="Women support programs">
          {company.womenSupport && company.womenSupport.programs.length > 0 ? (
            <ul className={styles.detailsList}>
              {company.womenSupport.programs.map((program) => (
                <li key={program}>{program}</li>
              ))}
            </ul>
          ) : (
            <p className={styles.detailsText}>None published</p>
          )}
        </Block>
      </div>
    </section>
  );
}
