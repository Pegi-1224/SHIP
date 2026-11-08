import { useId, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import { useDebouncedValue } from '@mantine/hooks';
import { paths } from '@/shared/config/paths';
import { US_STATE_OPTIONS } from '@/shared/config/formOptions';
import { INDUSTRIES } from '@/shared/types/common';
import type { CompanyRecord } from '@/shared/types/demoSearch';
import type { NewCompanyFieldErrors } from '@/shared/utils/newCompany';
import { useDemoCompanyNameSuggestions } from '../../hooks/useCompanies';
import { SelectField, TextField } from './controls';
import type { DetailsDraft } from './draft';
import styles from './AddCompany.module.css';

/** Wait this long after typing stops before looking up matching names. */
const SUGGEST_DELAY_MS = 150;

export interface CompanyDetailsStepProps {
  draft: DetailsDraft;
  onChange: (patch: Partial<DetailsDraft>) => void;
  errors: NewCompanyFieldErrors;
  onCancel: () => void;
  onNext: (similar: CompanyRecord[]) => void;
}

/**
 * Step 1: name, website, industry and headquarters state. While the name is
 * typed, companies with a similar name drop down under the box like a select
 * menu; picking one says it already exists and links to its page instead of
 * adding a duplicate.
 */
export function CompanyDetailsStep({
  draft,
  onChange,
  errors,
  onCancel,
  onNext,
}: CompanyDetailsStepProps) {
  const [debouncedName] = useDebouncedValue(draft.name.trim(), SUGGEST_DELAY_MS);
  const nameSearch = useDemoCompanyNameSuggestions(debouncedName);
  const [picked, setPicked] = useState<CompanyRecord | null>(null);
  // Closed by Escape, leaving the box or picking; typing opens it again.
  const [open, setOpen] = useState(true);
  const [active, setActive] = useState(-1);
  const listId = useId();

  // From the first letter: "A" lists the companies starting with A, A to Z.
  const similar =
    debouncedName && draft.name.trim() ? (nameSearch.data?.items ?? []).map((hit) => hit.item) : [];

  const showList = open && !picked && similar.length > 0;
  const optionId = (index: number) => `${listId}-${index}`;

  function pick(company: CompanyRecord) {
    setPicked(company);
    setOpen(false);
    setActive(-1);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (!showList) {
      if (event.key === 'ArrowDown' && similar.length > 0) setOpen(true);
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActive((current) => (current + step + similar.length) % similar.length);
    } else if (event.key === 'Enter' && similar[active]) {
      event.preventDefault();
      pick(similar[active]);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onNext(similar);
  }

  const suggestions = picked ? (
    <div className={styles.exists} role="status">
      <p className={styles.existsTitle}>{picked.name} is already on SHIP.</p>
      <p className={styles.existsText}>
        No need to add it again. You can read its data and share yours on its page.
      </p>
      <Link to={paths.companyDetail(picked.id)} className={styles.existsLink}>
        Go to {picked.name} ›
      </Link>
      <button type="button" className={styles.textButton} onClick={() => setPicked(null)}>
        It’s a different company
      </button>
    </div>
  ) : showList ? (
    <div className={styles.suggestMenu}>
      <p className={styles.suggestionsTitle} id={`${listId}-label`}>
        Similar companies already on SHIP
      </p>
      <ul
        id={listId}
        role="listbox"
        aria-labelledby={`${listId}-label`}
        className={styles.suggestionList}
      >
        {similar.map((company, index) => (
          <li
            key={company.id}
            id={optionId(index)}
            role="option"
            aria-selected={index === active}
            className={styles.suggestion}
            // Keep focus in the name box so the list doesn't close before the click lands.
            onMouseDown={(event) => event.preventDefault()}
            onMouseEnter={() => setActive(index)}
            onClick={() => pick(company)}
          >
            <span className={styles.suggestionName}>{company.name}</span>
            <span className={styles.suggestionMeta}>
              {company.industry} · {company.location}
            </span>
          </li>
        ))}
      </ul>
    </div>
  ) : null;

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className={styles.detailsCard}>
        <TextField
          large
          autoFocus
          label="Company name"
          value={draft.name}
          onChange={(name) => {
            setPicked(null);
            setOpen(true);
            setActive(-1);
            onChange({ name });
          }}
          placeholder="Please input the company name"
          error={errors['company.name']?.[0]}
          after={suggestions}
          inputProps={{
            role: 'combobox',
            'aria-autocomplete': 'list',
            'aria-expanded': showList,
            'aria-controls': showList ? listId : undefined,
            'aria-activedescendant': showList && active >= 0 ? optionId(active) : undefined,
            onKeyDown: handleKeyDown,
            onBlur: () => setOpen(false),
          }}
        />
        <TextField
          large
          label="Company website"
          prefix="https://"
          inputMode="url"
          value={draft.website}
          // The box already shows https://, so drop it when pasted.
          onChange={(website) => onChange({ website: website.replace(/^https?:\/\//i, '') })}
          placeholder="example.com"
          error={errors['company.website']?.[0]}
        />
        <div className={styles.row}>
          <SelectField
            large
            label="Industry"
            value={draft.industry}
            options={INDUSTRIES}
            onChange={(industry) => onChange({ industry })}
            placeholder="Select industry"
            error={errors['company.industry']?.[0]}
          />
          <SelectField
            large
            label="Headquarters state"
            value={draft.state}
            options={US_STATE_OPTIONS}
            onChange={(state) => onChange({ state })}
            placeholder="Select U.S. state"
            error={errors['company.state']?.[0]}
          />
        </div>
      </div>

      <div className={styles.actions}>
        <button type="button" className={`${styles.button} ${styles.cancel}`} onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className={`${styles.button} ${styles.primary} ${styles.next}`}>
          Next: share your data <span aria-hidden="true">›</span>
        </button>
      </div>
    </form>
  );
}
