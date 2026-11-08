import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { paths } from '@/shared/config/paths';
import { ErrorState, LoadingState } from '@/shared/ui';
import { CompanyCombobox, type ChosenCompany } from '../components/compare/CompanyCombobox';
import { CompareBoxes } from '../components/compare/CompareBoxes';
import { CompareSummary } from '../components/compare/CompareSummary';
import { SIDE_COLORS } from '../components/compare/sideColors';
import { useDemoCompany } from '../hooks/useCompanies';
import profile from '../components/profile/profile.module.css';
import styles from '../components/compare/compare.module.css';

/**
 * Side-by-side company comparison (`/compare?a=&b=`, spec 6.3; UI design, Nov 2026).
 *
 * Reached from a company page's Compare button with `a` set; the user then picks `b`. The two
 * boxes in the compare bar are a draft: changing either one does nothing until Compare is
 * pressed, which writes both into the URL. The URL is the comparison shown, so it can be shared
 * and Back works.
 *
 * Everything compared is public data. The summary is worked out in
 * `utils/recordComparison.ts`.
 */
export function ComparePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const idA = searchParams.get('a') ?? undefined;
  const idB = searchParams.get('b') ?? undefined;
  const companyA = useDemoCompany(idA);
  const companyB = useDemoCompany(idB);

  // Drafts start from the URL's companies once they load; `null` means "not changed yet".
  const [draftA, setDraftA] = useState<ChosenCompany | null>(null);
  const [draftB, setDraftB] = useState<ChosenCompany | null>(null);
  const loadedA = companyA.data ? { id: companyA.data.id, name: companyA.data.name } : null;
  const loadedB = companyB.data ? { id: companyB.data.id, name: companyB.data.name } : null;
  const chosenA = draftA ?? loadedA;
  const chosenB = draftB ?? loadedB;

  const canCompare =
    chosenA !== null &&
    chosenB !== null &&
    chosenA.id !== chosenB.id &&
    (chosenA.id !== idA || chosenB.id !== idB);

  const compare = () => {
    if (!chosenA || !chosenB) return;
    setSearchParams({ a: chosenA.id, b: chosenB.id });
    setDraftA(null);
    setDraftB(null);
  };

  const loading = (idA && companyA.isPending) || (idB && companyB.isPending);
  const failed = companyA.isError ? companyA : companyB.isError ? companyB : null;

  return (
    <div className={`${profile.page} ${styles.page}`}>
      <h1 className="ship-visually-hidden">Compare companies</h1>

      {companyA.data ? (
        <Link to={paths.companyDetail(companyA.data.id)} className={styles.back}>
          <span aria-hidden="true">‹</span> Back to {companyA.data.name}
        </Link>
      ) : null}

      <form
        className={styles.bar}
        aria-label="Companies to compare"
        onSubmit={(event) => {
          event.preventDefault();
          compare();
        }}
      >
        {/* Remount when the applied company changes, so the box shows its name. */}
        <CompanyCombobox
          key={`a-${idA ?? ''}-${loadedA?.name ?? ''}`}
          label="First company"
          value={chosenA}
          onChange={setDraftA}
          color={SIDE_COLORS.a}
          excludeId={chosenB?.id}
        />
        <span className={styles.vs} aria-hidden="true">
          VS
        </span>
        <CompanyCombobox
          key={`b-${idB ?? ''}-${loadedB?.name ?? ''}`}
          label="Second company"
          value={chosenB}
          onChange={setDraftB}
          color="#77a4fd"
          excludeId={chosenA?.id}
          autoFocus={Boolean(idA) && !idB}
        />
        <button type="submit" className={styles.compareButton} disabled={!canCompare}>
          Compare
        </button>
      </form>

      {loading ? (
        <LoadingState label="Loading companies…" />
      ) : failed ? (
        <ErrorState error={failed.error} onRetry={() => void failed.refetch()} />
      ) : companyA.data && companyB.data ? (
        <>
          <CompareSummary a={companyA.data} b={companyB.data} />
          <CompareBoxes a={companyA.data} b={companyB.data} />
        </>
      ) : (
        <p className={styles.prompt}>
          {companyA.data
            ? `Search for a company to compare with ${companyA.data.name}, then press Compare.`
            : 'Search for two companies, then press Compare.'}
        </p>
      )}
    </div>
  );
}
