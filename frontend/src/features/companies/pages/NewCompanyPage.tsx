import { useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/app/providers/useAuth';
import { getErrorMessage, isApiError } from '@/shared/api';
import { paths } from '@/shared/config/paths';
import type { CompanyRecord } from '@/shared/types/demoSearch';
import { notifySuccess } from '@/shared/ui';
import {
  findSameCompany,
  validateCompanyData,
  validateCompanyDetails,
  type NewCompanyFieldErrors,
} from '@/shared/utils/newCompany';
import { CompanyDetailsStep } from '../components/addCompany/CompanyDetailsStep';
import { PrivacyPanel, ShareDataStep } from '../components/addCompany/ShareDataStep';
import { emptyData, emptyDetails, toAnswers, type DataDraft } from '../components/addCompany/draft';
import { useCreateDemoCompany } from '../hooks/useCompanies';
import styles from '../components/addCompany/AddCompany.module.css';

/**
 * Add a company (`/companies/new`), in two steps: the company's details, then
 * the user's own workplace data. Reached from "Add this company" when the Home
 * search finds nothing, which pre-fills the name (`?name=`).
 *
 * Nothing is saved until Save on step 2: `POST /demo/companies` adds the
 * company and the answers together, and under `npm run dev` writes them into
 * `src/mocks/data/companies.json`. Then it opens the new company's page.
 */
export function NewCompanyPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const createCompany = useCreateDemoCompany();

  const [step, setStep] = useState<1 | 2>(1);
  const [details, setDetails] = useState(() => emptyDetails(searchParams.get('name') ?? ''));
  const [data, setData] = useState<DataDraft | null>(null);
  const [errors, setErrors] = useState<NewCompanyFieldErrors>({});

  function goTo(next: 1 | 2) {
    setStep(next);
    window.scrollTo({ top: 0 });
  }

  function handleNext(similar: CompanyRecord[]) {
    const result = validateCompanyDetails(details);
    const duplicate = findSameCompany(details.name, similar);
    if (!result.ok || duplicate) {
      setErrors({
        ...(result.ok ? {} : result.fieldErrors),
        ...(duplicate ? { 'company.name': [`${duplicate.name} is already on SHIP.`] } : {}),
      });
      return;
    }
    setErrors({});
    // Salary state starts at the headquarters; kept if the user comes back to step 1.
    setData((current) => current ?? emptyData(result.value.state));
    goTo(2);
  }

  function handleSave() {
    if (!data) return;
    const company = validateCompanyDetails(details);
    const answers = validateCompanyData(toAnswers(data));
    if (!company.ok || !answers.ok) {
      setErrors({
        ...(company.ok ? {} : company.fieldErrors),
        ...(answers.ok ? {} : answers.fieldErrors),
      });
      if (!company.ok) goTo(1);
      return;
    }
    setErrors({});
    createCompany.mutate(
      { company: company.value, data: answers.value },
      {
        onSuccess: ({ company: saved, savedToFile }) => {
          notifySuccess(
            savedToFile
              ? `${saved.name} and your data were saved to the demo data.`
              : `${saved.name} and your data were added for this session.`,
            'Company added',
          );
          navigate(paths.companyDetail(saved.id));
        },
        onError: (error) => {
          if (isApiError(error) && error.fieldErrors) {
            setErrors(error.fieldErrors);
            if (Object.keys(error.fieldErrors).some((key) => key.startsWith('company.'))) goTo(1);
          }
        },
      },
    );
  }

  const requestError =
    createCompany.error && !(isApiError(createCompany.error) && createCompany.error.fieldErrors)
      ? createCompany.error
      : null;
  const hasErrors = Object.keys(errors).length > 0;

  const notice = (
    <>
      {!user ? (
        <p className={styles.notice}>
          <Link to={paths.loginWithRedirect(location.pathname)}>Sign in</Link> to save. Your answers
          are always stored anonymously.
        </p>
      ) : null}
      {hasErrors && step === 2 ? (
        <p className={styles.notice} role="alert">
          Some answers need a look. They’re marked in red above.
        </p>
      ) : null}
      {requestError ? (
        <p className={styles.notice} role="alert">
          {getErrorMessage(requestError)}
        </p>
      ) : null}
    </>
  );

  return (
    <div className={step === 2 ? `${styles.page} ${styles.wide}` : styles.page}>
      <div className={styles.stepRow}>
        <span className={styles.stepPill}>Step {step} of 2</span>
        <span className={styles.stepHint}>Company details, then your data</span>
      </div>
      <div
        className={styles.progress}
        role="progressbar"
        aria-label="Progress"
        aria-valuemin={0}
        aria-valuemax={2}
        aria-valuenow={step}
      >
        <div className={styles.progressFill} style={{ width: step === 1 ? '50%' : '100%' }} />
      </div>
      <h1 className={styles.title}>{step === 1 ? 'Add this company' : 'Share your data'}</h1>
      {step === 2 ? <p className={styles.subtitle}>About {details.name.trim()}</p> : null}

      {step === 1 || !data ? (
        <CompanyDetailsStep
          draft={details}
          onChange={(patch) => setDetails((current) => ({ ...current, ...patch }))}
          errors={errors}
          onCancel={() => navigate(-1)}
          onNext={handleNext}
        />
      ) : (
        <div className={styles.dataLayout}>
          <ShareDataStep
            draft={data}
            onChange={(section, patch) =>
              setData((current) =>
                current ? { ...current, [section]: { ...current[section], ...patch } } : current,
              )
            }
            errors={errors}
            notice={notice}
            isPending={createCompany.isPending}
            canSave={Boolean(user)}
            onBack={() => goTo(1)}
            onSave={handleSave}
          />
          <PrivacyPanel />
        </div>
      )}
    </div>
  );
}
