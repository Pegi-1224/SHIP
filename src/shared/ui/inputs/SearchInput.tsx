import { type FormEvent, useState } from 'react';
import { ActionIcon, CloseButton, TextInput } from '@mantine/core';
import { Search } from 'lucide-react';

export interface SearchInputProps {
  /** Required: every input needs a programmatic label. */
  label: string;
  placeholder?: string;
  /** Initial text, e.g. read from the URL on first render. */
  defaultValue?: string;
  /** Fired on submit (Enter or the search button), not on every keystroke. */
  onSearch: (query: string) => void;
  /** Fired on every keystroke, for type-ahead suggestions. */
  onChange?: (query: string) => void;
  /** Hide the label visually while keeping it for screen readers. */
  hideLabel?: boolean;
  size?: 'sm' | 'md';
  autoFocus?: boolean;
  name?: string;
}

/**
 * The shared search control.
 *
 * It is a real `<form>`, so Enter submits and mobile keyboards show a search
 * key. Submitting with an empty field is allowed and clears the current query -
 * the caller decides what that means.
 */
export function SearchInput({
  label,
  placeholder,
  defaultValue = '',
  onSearch,
  onChange,
  hideLabel = false,
  size = 'md',
  autoFocus = false,
  name = 'q',
}: SearchInputProps) {
  const [value, setValue] = useState(defaultValue);
  const [syncedDefault, setSyncedDefault] = useState(defaultValue);

  // Re-sync when the URL changes underneath us (Back button, tag click).
  // Adjusting state during render is React's recommended pattern for this and
  // avoids the extra render pass an effect would cause.
  if (defaultValue !== syncedDefault) {
    setSyncedDefault(defaultValue);
    setValue(defaultValue);
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSearch(value.trim());
  };

  const handleChange = (next: string) => {
    setValue(next);
    onChange?.(next);
  };

  return (
    <form onSubmit={handleSubmit} role="search">
      <TextInput
        name={name}
        label={label}
        labelProps={hideLabel ? { className: 'ship-visually-hidden' } : undefined}
        placeholder={placeholder}
        value={value}
        onChange={(event) => handleChange(event.currentTarget.value)}
        size={size}
        autoFocus={autoFocus}
        autoComplete="off"
        leftSection={<Search size={16} aria-hidden="true" />}
        rightSection={
          value ? (
            <CloseButton
              size="sm"
              aria-label="Clear search"
              onClick={() => {
                handleChange('');
                onSearch('');
              }}
            />
          ) : (
            // Distinct from the field's own label, so assistive tech (and
            // tests) can tell the input and the submit control apart.
            <ActionIcon type="submit" variant="subtle" aria-label="Submit search" size="sm">
              <Search size={16} aria-hidden="true" />
            </ActionIcon>
          )
        }
      />
    </form>
  );
}
