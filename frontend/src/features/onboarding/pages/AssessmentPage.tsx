import { useEffect, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import { Button, Checkbox, Chip, CloseButton, Group, Radio, Stack, Text } from '@mantine/core';
import { fetchCompanyProfile, CompanyPicker } from '@/features/companies';
import { useAuth } from '@/app/providers/useAuth';
import { MAX_PRIORITY_ANSWERS, MAX_TOPIC_ANSWERS } from '@/shared/config/constants';
import { paths } from '@/shared/config/paths';
import {
  ASSESSMENT_INDUSTRIES,
  ASSESSMENT_TOPIC_TAGS,
  CAREER_STAGES,
  CAREER_STAGE_LABELS,
  PRIORITIES,
  PRIORITY_LABELS,
} from '@/shared/types/assessment';
import { FormErrorAlert, LoadingState } from '@/shared/ui';
import { formatTag } from '@/shared/utils/format';
import { QuestionShell } from '../components/QuestionShell';
import { useMyAssessment, useSaveAssessment } from '../hooks/useAssessment';
import {
  assessmentSchema,
  STEP_FIELDS,
  TOTAL_STEPS,
  type AssessmentFormValues,
} from '../schemas/assessmentSchema';
import styles from './AssessmentPage.module.css';

/** The five questions of spec 3.3, in order. Answers 3 and 4 drive the home recommendations. */
const QUESTIONS = [
  {
    question: 'Where are you in your career right now?',
    hint: 'Pick the one that fits best.',
  },
  {
    question: 'Which industries are you interested in?',
    hint: 'Choose all that apply.',
  },
  {
    question: 'What matters most to you when choosing a company?',
    hint: `Choose up to ${MAX_PRIORITY_ANSWERS}. We use this to recommend discussions.`,
  },
  {
    question: 'Which topics do you want to see in discussions?',
    hint: `Choose up to ${MAX_TOPIC_ANSWERS}. We use this to recommend discussions on your home page.`,
  },
  {
    question: 'Are there companies you want to follow?',
    hint: 'You can skip this and add companies later.',
    optional: true,
  },
] as const;

/** Names for followed company ids, so a retake can show them. Ids picked this session are already known. */
function useCompanyNames(ids: readonly string[], known: Record<string, string>) {
  const missing = ids.filter((id) => known[id] === undefined);
  const results = useQueries({
    queries: missing.map((id) => ({
      queryKey: ['assessment', 'company-name', id],
      queryFn: ({ signal }: { signal: AbortSignal }) => fetchCompanyProfile(id, signal),
      staleTime: Infinity,
    })),
  });

  const names = { ...known };
  missing.forEach((id, index) => {
    const company = results[index]?.data?.company;
    if (company) names[id] = company.name;
  });
  return names;
}

/**
 * Onboarding assessment (`/assessment`, spec 3.3, 6.6).
 *
 * Five questions, one per screen, each validated before moving on. It is used twice: by a new
 * account (answers start empty, and finishing sends them Home), and as a retake from Profile
 * (answers are pre-filled from what was saved, and finishing sends them back to Profile). Saving
 * flips `hasCompletedAssessment`, which releases the router's assessment gate, and the next home
 * refresh recommends against the new answers.
 *
 * This route sits inside `RequireAuth` but outside `RequireAssessment` (see `AppRoutes.tsx`).
 * The controls are plain buttons rather than a `<form>`: question 5 embeds a search box, and forms
 * cannot nest.
 */
export function AssessmentPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  // Saving flips `hasCompletedAssessment`, so remember what it was on arrival.
  const [isRetake] = useState(Boolean(user?.hasCompletedAssessment));

  const [step, setStep] = useState(0);
  const [followedNames, setFollowedNames] = useState<Record<string, string>>({});

  const saved = useMyAssessment(isRetake);
  const save = useSaveAssessment();

  const form = useForm<AssessmentFormValues>({
    resolver: zodResolver(assessmentSchema),
    defaultValues: { industries: [], priorities: [], topics: [], followedCompanyIds: [] },
  });
  const { reset, control, trigger, handleSubmit, formState } = form;

  // Pre-fill a retake once, and never over something the user has already changed.
  const savedAnswers = saved.data?.answers;
  const { isDirty } = formState;
  useEffect(() => {
    if (savedAnswers && !isDirty) reset(savedAnswers);
  }, [savedAnswers, isDirty, reset]);

  // useWatch is the subscription API; form.watch() cannot be memoized safely.
  const followedIds = useWatch({ control, name: 'followedCompanyIds' });
  const names = useCompanyNames(followedIds, followedNames);

  const goNext = async () => {
    const valid = await trigger(STEP_FIELDS[step]);
    if (valid) setStep((current) => Math.min(current + 1, TOTAL_STEPS - 1));
  };

  const finish = handleSubmit(
    async (answers) => {
      await save.mutateAsync(answers);
      navigate(isRetake ? paths.profile() : paths.home(), { replace: true });
    },
    // Something is wrong on a question the user already passed (possible after a retake pre-fill).
    (errors) => {
      const first = STEP_FIELDS.findIndex((fields) => fields.some((field) => field in errors));
      if (first >= 0) setStep(first);
    },
  );

  if (isRetake && saved.isPending) return <LoadingState label="Loading your answers…" />;

  const stepError = (field: keyof AssessmentFormValues) => {
    const message = formState.errors[field]?.message;
    return typeof message === 'string' ? message : null;
  };

  const isLast = step === TOTAL_STEPS - 1;
  const current = QUESTIONS[step] ?? QUESTIONS[0];

  const footer = (
    <Group justify="space-between">
      <Button
        variant="default"
        className={styles.back}
        onClick={() => setStep((value) => Math.max(value - 1, 0))}
        disabled={step === 0 || save.isPending}
      >
        Back
      </Button>
      {isLast ? (
        <Button
          onClick={() => void finish()}
          loading={save.isPending}
          color="#5b2acf"
          className={styles.next}
        >
          {isRetake ? 'Save my answers' : 'Finish'}
        </Button>
      ) : (
        <Button onClick={() => void goNext()} color="#5b2acf" className={styles.next}>
          Next
        </Button>
      )}
    </Group>
  );

  return (
    <section className={styles.page} aria-labelledby="assessment-title">
      {/* The design leads with the progress bar, so the heading is for screen readers. */}
      <header className="ship-visually-hidden">
        <h1 id="assessment-title">Personalize your SHIP</h1>
        <p>
          {isRetake
            ? 'Update your answers. Your recommendations change as soon as you save.'
            : 'Five quick questions so we can recommend the discussions that matter to you.'}
        </p>
      </header>

      <QuestionShell
        stepIndex={step}
        totalSteps={TOTAL_STEPS}
        question={current.question}
        hint={current.hint}
        optional={'optional' in current}
        error={
          step === 0
            ? stepError('stage')
            : step === 1
              ? stepError('industries')
              : step === 2
                ? stepError('priorities')
                : step === 3
                  ? stepError('topics')
                  : stepError('followedCompanyIds')
        }
        footer={footer}
      >
        {step === 0 ? (
          <Controller
            control={control}
            name="stage"
            render={({ field }) => (
              <Radio.Group
                value={field.value ?? null}
                onChange={field.onChange}
                aria-label={current.question}
              >
                <Stack gap="xs">
                  {CAREER_STAGES.map((stage) => (
                    <Radio.Card key={stage} value={stage} className={styles.option} radius="md">
                      <Group wrap="nowrap" align="center">
                        <Radio.Indicator />
                        <Text size="sm">{CAREER_STAGE_LABELS[stage]}</Text>
                      </Group>
                    </Radio.Card>
                  ))}
                </Stack>
              </Radio.Group>
            )}
          />
        ) : null}

        {step === 1 ? (
          <Controller
            control={control}
            name="industries"
            render={({ field }) => (
              <Checkbox.Group
                value={field.value}
                onChange={field.onChange}
                aria-label={current.question}
              >
                <Stack gap="xs">
                  {ASSESSMENT_INDUSTRIES.map((industry) => (
                    <Checkbox.Card
                      key={industry}
                      value={industry}
                      className={styles.option}
                      radius="md"
                    >
                      <Group wrap="nowrap" align="center">
                        <Checkbox.Indicator />
                        <Text size="sm">{industry}</Text>
                      </Group>
                    </Checkbox.Card>
                  ))}
                </Stack>
              </Checkbox.Group>
            )}
          />
        ) : null}

        {step === 2 ? (
          <Controller
            control={control}
            name="priorities"
            render={({ field }) => {
              const full = field.value.length >= MAX_PRIORITY_ANSWERS;
              return (
                <>
                  <Checkbox.Group
                    value={field.value}
                    // A blocked option cannot be clicked, but the keyboard can still toggle it.
                    onChange={(chosen) => {
                      if (chosen.length <= MAX_PRIORITY_ANSWERS) field.onChange(chosen);
                    }}
                    aria-label={current.question}
                  >
                    <Stack gap="xs">
                      {PRIORITIES.map((priority) => {
                        const blocked = full && !field.value.includes(priority);
                        return (
                          <Checkbox.Card
                            key={priority}
                            value={priority}
                            className={styles.option}
                            radius="md"
                            data-blocked={blocked || undefined}
                            aria-disabled={blocked || undefined}
                            // Clicking a blocked option would select a fourth one.
                            style={blocked ? { pointerEvents: 'none' } : undefined}
                          >
                            <Group wrap="nowrap" align="center">
                              <Checkbox.Indicator disabled={blocked} />
                              <Text size="sm" c={blocked ? 'dimmed' : undefined}>
                                {PRIORITY_LABELS[priority]}
                              </Text>
                            </Group>
                          </Checkbox.Card>
                        );
                      })}
                    </Stack>
                  </Checkbox.Group>
                  <Text size="xs" c="dimmed" aria-live="polite">
                    {field.value.length} of {MAX_PRIORITY_ANSWERS} chosen
                  </Text>
                </>
              );
            }}
          />
        ) : null}

        {step === 3 ? (
          <Controller
            control={control}
            name="topics"
            render={({ field }) => {
              const full = field.value.length >= MAX_TOPIC_ANSWERS;
              return (
                <>
                  <Chip.Group
                    multiple
                    value={field.value}
                    onChange={(chosen) => {
                      if (chosen.length <= MAX_TOPIC_ANSWERS) field.onChange(chosen);
                    }}
                  >
                    <Group gap="xs" role="group" aria-label={current.question}>
                      {ASSESSMENT_TOPIC_TAGS.map((tag) => (
                        <Chip
                          key={tag}
                          value={tag}
                          variant="light"
                          // Same rule as question 3: once three are chosen, the rest wait.
                          disabled={full && !field.value.includes(tag)}
                        >
                          {formatTag(tag)}
                        </Chip>
                      ))}
                    </Group>
                  </Chip.Group>
                  <Text size="xs" c="dimmed" aria-live="polite">
                    {field.value.length} of {MAX_TOPIC_ANSWERS} chosen
                  </Text>
                </>
              );
            }}
          />
        ) : null}

        {step === 4 ? (
          <Controller
            control={control}
            name="followedCompanyIds"
            render={({ field }) => (
              <Stack gap="md">
                <CompanyPicker
                  label="Search a company"
                  placeholder="Search by company name"
                  selectedIds={field.value}
                  onSelect={(company) => {
                    if (field.value.includes(company.id)) {
                      field.onChange(field.value.filter((id) => id !== company.id));
                      return;
                    }
                    setFollowedNames((previous) => ({ ...previous, [company.id]: company.name }));
                    field.onChange([...field.value, company.id]);
                  }}
                  emptyHint="Search above, then press Select on the companies you want to follow."
                />

                {field.value.length > 0 ? (
                  <div>
                    <Text size="sm" fw={600} mb={6}>
                      Following ({field.value.length})
                    </Text>
                    <ul className={styles.followed}>
                      {field.value.map((id) => (
                        <li key={id} className={styles.followedItem}>
                          <span>{names[id] ?? id}</span>
                          {/* A real button: Mantine's Pill hides its remove button from the keyboard. */}
                          <CloseButton
                            size="xs"
                            aria-label={`Stop following ${names[id] ?? id}`}
                            onClick={() =>
                              field.onChange(field.value.filter((other) => other !== id))
                            }
                          />
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </Stack>
            )}
          />
        ) : null}

        {isLast ? (
          <FormErrorAlert
            error={save.error}
            onRetry={() => void finish()}
            isRetrying={save.isPending}
          />
        ) : null}
      </QuestionShell>
    </section>
  );
}
