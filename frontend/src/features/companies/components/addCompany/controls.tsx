import { useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import type { YesNoNotSure } from '@/shared/types/companySubmission';
import styles from './AddCompany.module.css';

interface FieldShellProps {
  label: string;
  error?: string | null;
  className?: string;
  children: (props: { id: string; describedBy: string | undefined; invalid: boolean }) => ReactNode;
}

/** A label, the control, and its error underneath. */
function FieldShell({ label, error, className, children }: FieldShellProps) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div className={className ?? styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      {children({ id, describedBy: error ? errorId : undefined, invalid: Boolean(error) })}
      {error ? (
        <p id={errorId} className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export interface SelectFieldProps {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
  /** Shown first and not selectable, e.g. "Select industry". Omit to always have a value. */
  placeholder?: string;
  error?: string | null;
  large?: boolean;
}

/** A native `<select>`, so keyboard, screen reader and mobile pickers all work as expected. */
export function SelectField({
  label,
  value,
  options,
  onChange,
  placeholder,
  error,
  large = false,
}: SelectFieldProps) {
  return (
    <FieldShell label={label} error={error} className={large ? styles.fieldLarge : undefined}>
      {({ id, describedBy, invalid }) => (
        <div className={styles.selectWrap}>
          <select
            id={id}
            className={[
              large ? styles.inputLarge : styles.input,
              styles.select,
              value ? '' : styles.placeholder,
              invalid ? styles.invalid : '',
            ].join(' ')}
            value={value}
            onChange={(event) => onChange(event.currentTarget.value)}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
          >
            {placeholder ? (
              <option value="" disabled>
                {placeholder}
              </option>
            ) : null}
            {options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <ChevronDown className={styles.selectIcon} size={18} aria-hidden="true" />
        </div>
      )}
    </FieldShell>
  );
}

export interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string | null;
  inputMode?: 'text' | 'numeric' | 'decimal' | 'url';
  /** Fixed text inside the box before what the user types, e.g. `https://`. */
  prefix?: string;
  large?: boolean;
  autoFocus?: boolean;
  /** Extra content under the box, before the error (the similar-company list). */
  after?: ReactNode;
  /** Extra attributes for the `<input>`, e.g. the combobox ARIA of the name box. */
  inputProps?: InputHTMLAttributes<HTMLInputElement>;
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  error,
  inputMode = 'text',
  prefix,
  large = false,
  autoFocus = false,
  after,
  inputProps,
}: TextFieldProps) {
  return (
    <FieldShell label={label} error={error} className={large ? styles.fieldLarge : undefined}>
      {({ id, describedBy, invalid }) => (
        <>
          <div
            className={[
              large ? styles.inputLarge : styles.input,
              styles.textBox,
              invalid ? styles.invalid : '',
            ].join(' ')}
          >
            {prefix ? (
              <span className={styles.prefix} aria-hidden="true">
                {prefix}
              </span>
            ) : null}
            <input
              {...inputProps}
              id={id}
              className={styles.bareInput}
              value={value}
              onChange={(event) => onChange(event.currentTarget.value)}
              placeholder={placeholder}
              inputMode={inputMode}
              autoComplete="off"
              autoFocus={autoFocus}
              aria-invalid={invalid || undefined}
              aria-describedby={describedBy}
            />
          </div>
          {after}
        </>
      )}
    </FieldShell>
  );
}

interface ChoiceOption<T extends string> {
  value: T;
  label: string;
}

interface ChoiceGroupProps<T extends string> {
  label: string;
  value: T;
  options: readonly ChoiceOption<T>[];
  onChange: (value: T) => void;
  wide?: boolean;
}

/** Yes / No (or Yes / No / Not sure) as a radio group; the picked one sits raised and white. */
function ChoiceGroup<T extends string>({
  label,
  value,
  options,
  onChange,
  wide,
}: ChoiceGroupProps<T>) {
  const id = useId();
  return (
    <div className={styles.field}>
      <p id={id} className={styles.label}>
        {label}
      </p>
      <div
        role="radiogroup"
        aria-labelledby={id}
        className={`${styles.choices} ${wide ? styles.choicesWide : ''}`}
      >
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={value === option.value}
            className={styles.choice}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

const YES_NO: readonly ChoiceOption<'yes' | 'no'>[] = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
];

const YES_NO_NOT_SURE: readonly ChoiceOption<YesNoNotSure>[] = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
  { value: 'not_sure', label: 'Not Sure' },
];

export function YesNoField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <ChoiceGroup
      label={label}
      value={value ? 'yes' : 'no'}
      options={YES_NO}
      onChange={(next) => onChange(next === 'yes')}
    />
  );
}

export function YesNoNotSureField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: YesNoNotSure;
  onChange: (value: YesNoNotSure) => void;
}) {
  return (
    <ChoiceGroup label={label} value={value} options={YES_NO_NOT_SURE} onChange={onChange} wide />
  );
}

export function CheckboxGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly string[];
  value: readonly string[];
  onChange: (value: string[]) => void;
}) {
  return (
    <fieldset className={`${styles.field} ${styles.fieldset}`}>
      <legend className={styles.label}>{label}</legend>
      <div className={styles.checkboxes}>
        {options.map((option) => {
          const checked = value.includes(option);
          return (
            <label key={option} className={styles.checkbox}>
              <input
                type="checkbox"
                className="ship-visually-hidden"
                checked={checked}
                onChange={() =>
                  onChange(checked ? value.filter((item) => item !== option) : [...value, option])
                }
              />
              <span className={styles.checkboxBox} aria-hidden="true">
                {checked ? <Check size={13} strokeWidth={3} /> : null}
              </span>
              {option}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export interface DataSectionProps {
  title: string;
  icon: ReactNode;
  /** CSS class setting the icon tile's colours. */
  iconClassName?: string;
  /** Optional sections show a "Skip this section" box; when ticked the fields are hidden. */
  skipped?: boolean;
  onSkipChange?: (skipped: boolean) => void;
  children: ReactNode;
}

/** One white box of step 2: icon tile, title, and its questions. */
export function DataSection({
  title,
  icon,
  iconClassName,
  skipped = false,
  onSkipChange,
  children,
}: DataSectionProps) {
  const id = useId();
  return (
    <section className={styles.section} aria-labelledby={id}>
      <header className={styles.sectionHeader}>
        <span className={`${styles.sectionIcon} ${iconClassName ?? ''}`} aria-hidden="true">
          {icon}
        </span>
        <h2 id={id} className={styles.sectionTitle}>
          {title}
        </h2>
        {onSkipChange ? (
          <label className={styles.skip}>
            <input
              type="checkbox"
              className="ship-visually-hidden"
              checked={skipped}
              onChange={(event) => onSkipChange(event.currentTarget.checked)}
            />
            <span className={styles.checkboxBox} aria-hidden="true">
              {skipped ? <Check size={13} strokeWidth={3} /> : null}
            </span>
            Skip this section
          </label>
        ) : null}
      </header>
      {skipped ? (
        <p className={styles.skippedNote}>Skipped. Nothing from this section will be saved.</p>
      ) : (
        <div className={styles.sectionBody}>{children}</div>
      )}
    </section>
  );
}
