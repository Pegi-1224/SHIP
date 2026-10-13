import { Checkbox } from '@mantine/core';

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
      description="SHIP does not verify this. You are confirming it yourself."
      error={error ?? undefined}
    />
  );
}
