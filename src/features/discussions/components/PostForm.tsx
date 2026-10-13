import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Group, Stack, Text, TextInput, Textarea } from '@mantine/core';
import { FormErrorAlert, SubmitButton, TagSelector } from '@/shared/ui';
import { useCreateTag, useTagSearch } from '../hooks/useDiscussions';
import { postSchema, POST_BODY_MAX, POST_TITLE_MAX, type PostFormValues } from '../schemas/postSchema';

export interface PostFormProps {
  defaultValues?: PostFormValues;
  submitLabel: string;
  isPending: boolean;
  /** The failed-mutation error, rendered inline so typed text survives. */
  error: unknown;
  onSubmit: (values: PostFormValues) => void;
  onCancel: () => void;
}

/**
 * The composer shared by "new post" and "edit post".
 *
 * Nothing in it clears on failure: the error renders beside the fields and the
 * form keeps every value, so Retry resubmits exactly what the user wrote
 * (spec 4.2, 5.5, AC-10).
 */
export function PostForm({
  defaultValues,
  submitLabel,
  isPending,
  error,
  onSubmit,
  onCancel,
}: PostFormProps) {
  const [tagSearch, setTagSearch] = useState('');
  const tagQuery = useTagSearch(tagSearch);
  const createTag = useCreateTag();

  const form = useForm<PostFormValues>({
    resolver: zodResolver(postSchema),
    defaultValues: defaultValues ?? { title: '', body: '', tags: [] },
  });

  const body = useWatch({ control: form.control, name: 'body' });
  const handleSubmit = form.handleSubmit((values) => onSubmit(values));

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Stack gap="md">
        <TextInput
          {...form.register('title')}
          label="Title"
          placeholder="What do you want to ask or share?"
          maxLength={POST_TITLE_MAX}
          error={form.formState.errors.title?.message}
          required
        />

        <div>
          <Textarea
            {...form.register('body')}
            label="Your post"
            placeholder="Give enough detail that someone can actually help."
            autosize
            minRows={6}
            maxRows={18}
            maxLength={POST_BODY_MAX}
            error={form.formState.errors.body?.message}
            required
          />
          <Text size="xs" c="dimmed" ta="right" mt={4}>
            {body.length} / {POST_BODY_MAX}
          </Text>
        </div>

        <Controller
          control={form.control}
          name="tags"
          render={({ field }) => (
            <TagSelector
              value={field.value}
              onChange={(tags) => {
                // Register any brand-new tag so it appears in search for
                // everyone. The server runs the authoritative word check.
                const added = tags.find((tag) => !field.value.includes(tag));
                const known = tagQuery.data?.some((entry) => entry.name === added);
                if (added && !known) createTag.mutate(added);
                field.onChange(tags);
              }}
              suggestions={tagQuery.data?.map((tag) => tag.name) ?? []}
              onSearchChange={setTagSearch}
              error={
                form.formState.errors.tags?.message ??
                (createTag.error instanceof Error ? createTag.error.message : null)
              }
            />
          )}
        />

        <Text size="xs" c="dimmed">
          Posts show your anonymous name only. Your email address is never shown to anyone.
        </Text>

        <FormErrorAlert
          error={error}
          onRetry={() => void handleSubmit()}
          isRetrying={isPending}
        />

        <Group justify="flex-end">
          <Button variant="default" onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
          <SubmitButton isPending={isPending} pendingLabel="Publishing…">
            {submitLabel}
          </SubmitButton>
        </Group>
      </Stack>
    </form>
  );
}
