import { useState, type CSSProperties } from 'react';
import { Select } from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { useDemoCompanySearch } from '../../hooks/useCompanies';
import styles from './compare.module.css';

export interface ChosenCompany {
  id: string;
  name: string;
}

export interface CompanyComboboxProps {
  label: string;
  value: ChosenCompany | null;
  onChange: (company: ChosenCompany | null) => void;
  /** The dot and border colour that marks this side throughout the comparison. */
  color: string;
  /** The company on the other side, left out of the results. */
  excludeId?: string;
  autoFocus?: boolean;
}

/**
 * One side of the compare bar: shows the chosen company, and searches the demo companies as the
 * user types over it. Choosing only fills the box; the Compare button applies it.
 */
export function CompanyCombobox({
  label,
  value,
  onChange,
  color,
  excludeId,
  autoFocus,
}: CompanyComboboxProps) {
  const [searchValue, setSearchValue] = useState(value?.name ?? '');
  // While the box just shows the chosen name, list every company rather than that one name.
  const typed = searchValue === value?.name ? '' : searchValue;
  const [query] = useDebouncedValue(typed.trim(), 200);
  const search = useDemoCompanySearch(query);

  const options = (search.data?.items ?? [])
    .map((hit) => hit.item)
    .filter((company) => company.id !== excludeId)
    .map((company) => ({ value: company.id, label: company.name }));
  // Mantine shows the chosen value's label only while it is among the options.
  if (value && !options.some((option) => option.value === value.id)) {
    options.unshift({ value: value.id, label: value.name });
  }

  return (
    <Select
      aria-label={label}
      placeholder="Search a company"
      searchable
      autoFocus={autoFocus}
      value={value?.id ?? null}
      data={options}
      // The server already filtered by what was typed.
      filter={({ options: all }) => all}
      searchValue={searchValue}
      onSearchChange={setSearchValue}
      onChange={(id, option) => onChange(id ? { id, name: option.label } : null)}
      nothingFoundMessage={search.isFetching ? 'Searching…' : 'No company matches that name'}
      leftSection={<span className={styles.pickerDot} style={{ backgroundColor: color }} />}
      leftSectionPointerEvents="none"
      classNames={{ input: styles.pickerInput, section: styles.pickerSection }}
      style={{ '--picker-border': color } as CSSProperties}
      className={styles.picker}
      comboboxProps={{ shadow: 'md' }}
      maxDropdownHeight={280}
    />
  );
}
