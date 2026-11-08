import { Checkbox } from '@mantine/core';
import styles from './EligibilityCheckbox.module.css';

export interface EligibilityCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  error?: string | null;
}

/**
 * Spec 2.1: at registration the user confirms they are a woman aged 18 or
 * older. No identity verification is performed and none is implied - this is a
 * declaration the user makes, recorded by the backend.
 */
export function EligibilityCheckbox({ checked, onChange, error }: EligibilityCheckboxProps) {
  return (
    <Checkbox
      checked={checked}
      onChange={(event) => onChange(event.currentTarget.checked)}
      label="I am a woman aged 18 or older"
      error={error ?? undefined}
      size="md"
      color="#5b2acf"
      radius={7.2}
      classNames={{ input: styles.input, label: styles.label, icon: styles.icon }}
    />
  );
}
