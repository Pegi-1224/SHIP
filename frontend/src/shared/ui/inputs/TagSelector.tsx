import { useState } from 'react';
import { Autocomplete, Button, Group, Input, Stack, Text } from '@mantine/core';
import { Plus } from 'lucide-react';
import { MIN_TAGS_PER_POST } from '@/shared/config/constants';
import { formatTag } from '@/shared/utils/format';
import { normalizeTag, validateTag } from '@/shared/utils/tags';
import { TagPill } from '@/shared/ui/data-display/TagPill';

export interface TagSelectorProps {
  value: string[];
  onChange: (tags: string[]) => void;
  /** Existing tag names offered as type-ahead suggestions. */
  suggestions?: string[];
  /** Notifies the caller so it can fetch suggestions for the typed prefix. */
  onSearchChange?: (search: string) => void;
  /** Validation message from the form, e.g. "Add at least one tag." */
  error?: string | null;
  maxTags?: number;
  label?: string;
  description?: string;
}

/**
 * Pick existing tags or create a new one (spec 3.4, 6.4).
 *
 * New tags are validated here for immediate feedback - length, allowed
 * characters and the banned-word list. That check is a convenience: the
 * backend must run the authoritative one, because anything in this bundle can
 * be bypassed (AC-8).
 */
export function TagSelector({
  value,
  onChange,
  suggestions = [],
  onSearchChange,
  error,
  maxTags = 5,
  label = 'Tags',
  description,
}: TagSelectorProps) {
  const [draft, setDraft] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const atLimit = value.length >= maxTags;

  const addTag = (raw: string) => {
    const result = validateTag(raw);
    if (!result.valid) {
      setLocalError(result.message);
      return;
    }

    const tag = normalizeTag(raw);
    if (value.includes(tag)) {
      setLocalError('That tag is already added.');
      return;
    }
    if (atLimit) {
      setLocalError(`You can add at most ${maxTags} tags.`);
      return;
    }

    setLocalError(null);
    setDraft('');
    onChange([...value, tag]);
  };

  const removeTag = (tag: string) => {
    setLocalError(null);
    onChange(value.filter((entry) => entry !== tag));
  };

  const visibleError = localError ?? error ?? null;

  return (
    <Input.Wrapper
      label={label}
      description={
        description ??
        `Add at least ${MIN_TAGS_PER_POST} tag so other people can find your post. Pick an existing tag or create a new one.`
      }
      error={visibleError}
    >
      <Stack gap="xs" mt="xs">
        <Group gap="xs" align="flex-start" wrap="nowrap">
          <Autocomplete
            value={draft}
            onChange={(next) => {
              setDraft(next);
              setLocalError(null);
              onSearchChange?.(normalizeTag(next));
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                // Enter adds a tag; it must not submit the surrounding form.
                event.preventDefault();
                addTag(draft);
              }
            }}
            data={suggestions.filter((tag) => !value.includes(tag)).map(formatTag)}
            placeholder="#pay gap"
            aria-label="Tag name"
            disabled={atLimit}
            style={{ flex: 1 }}
            comboboxProps={{ withinPortal: true }}
          />
          <Button
            variant="light"
            onClick={() => addTag(draft)}
            disabled={atLimit || draft.trim().length === 0}
            leftSection={<Plus size={16} aria-hidden="true" />}
          >
            Add
          </Button>
        </Group>

        {value.length > 0 ? (
          <Group gap="xs" wrap="wrap">
            {value.map((tag) => (
              <TagPill key={tag} tag={tag} onRemove={() => removeTag(tag)} />
            ))}
          </Group>
        ) : (
          <Text size="xs" c="dimmed">
            No tags added yet.
          </Text>
        )}

        {atLimit ? (
          <Text size="xs" c="dimmed">
            Tag limit reached ({maxTags}). Remove one to add another.
          </Text>
        ) : null}
      </Stack>
    </Input.Wrapper>
  );
}
