import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Checkbox, Group, Radio, Stack, Text } from '@mantine/core';
import { ArrowLeft } from 'lucide-react';
import {
  ASSESSMENT_INDUSTRIES,
  ASSESSMENT_TOPIC_TAGS,
  CAREER_STAGES,
  CAREER_STAGE_LABELS,
  PRIORITIES,
  PRIORITY_LABELS,
} from '@/shared/types/assessment';
import type { Company } from '@/shared/types/company';
import { MAX_PRIORITY_ANSWERS } from '@/shared/config/constants';
import { paths } from '@/shared/config/paths';
import { FormErrorAlert, LoadingState, SubmitButton, TagPill } from '@/shared/ui';
import { CompanyPicker } from '@/features/companies';
import { useAuth } from '@/app/providers/useAuth';
import { QuestionShell } from '../components/QuestionShell';
import { useMyAssessment, useSaveAssessment } from '../hooks/useAssessment';
import {
  assessmentSchema,
  STEP_FIELDS,
  TOTAL_STEPS,
  type AssessmentFormValues,
} from '../schemas/assessmentSchema';

/**
 * The five-question onboarding assessment (spec 3.3).
 *
 * One question per screen, questions 1-4 required and question 5 optional.
 * Back navigation never loses an answer: the whole form lives in one
 * react-hook-form instance and only the visible step changes.
 *
 * The same page handles retaking from Profile - it pre-fills with the saved
 * answers when there are any.
 */
export function AssessmentPage() {
  const navigate = useNavigate();
  const { user, refresh } = useAuth();
  const [step, setStep] = useState(0);
  const [followed, setFollowed] = useState<Company[]>([]);

  const existing = useMyAssessment();
  const save = useSaveAssessment();

  const form = useForm<AssessmentFormValues>({
    resolver: zodResolver(assessmentSchema),
    defaultValues: {
      stage: undefined,
      industries: [],
      priorities: [],
      topics: [],
      followedCompanyIds: [],
    },
  });

  // Pre-fill a retake once the saved answers arrive.
  useEffect(() => {
    const record = existing.data;
    if (!record) return;
    form.reset({
      stage: record.answers.stage,
      industries: record.answers.industries,
      priorities: record.answers.priorities,
      topics: record.answers.topics,
      followedCompanyIds: record.answers.followedCompanyIds,
    });
  }, [existing.data, form]);

  const isRetake = Boolean(existing.data);

  const goNext = async () => {
    const fields = STEP_FIELDS[step];
    if (!fields) return;
    const valid = await form.trigger([...fields]);
    if (valid) setStep((current) => Math.min(current + 1, TOTAL_STEPS - 1));
  };

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      await save.mutateAsync({
        stage: values.stage,
        industries: values.industries,
        priorities: values.priorities,
        topics: values.topics,
        followedCompanyIds: values.followedCompanyIds,
      });
      await refresh();
      // First completion goes home, where the instruction walkthrough opens.
      navigate(isRetake ? paths.profile() : paths.home(), { replace: true });
    } catch {
      // The mutation holds the error. Answers stay in the form so the user can
      // retry without re-entering anything (spec 5.5).
    }
  });

  if (existing.isPending) {
    return <LoadingState label="Loading your assessment…" />;
  }

  const errors = form.formState.errors;
  const isLastStep = step === TOTAL_STEPS - 1;

  const footer = (
    <Stack gap="sm">
      <FormErrorAlert
        error={save.error}
        onRetry={() => void handleSubmit()}
        isRetrying={save.isPending}
      />
      <Group justify="space-between">
        <Button
          variant="subtle"
          leftSection={<ArrowLeft size={16} aria-hidden="true" />}
          onClick={() => setStep((current) => Math.max(0, current - 1))}
          disabled={step === 0}
        >
          Back
        </Button>

        {isLastStep ? (
          <SubmitButton isPending={save.isPending} pendingLabel="Saving…">
            {isRetake ? 'Save answers' : 'Finish'}
          </SubmitButton>
        ) : (
          <Button onClick={() => void goNext()}>Next</Button>
        )}
      </Group>
    </Stack>
  );

  return (
    <form onSubmit={handleSubmit} noValidate>
      {step === 0 ? (
        <QuestionShell
          stepIndex={0}
          totalSteps={TOTAL_STEPS}
          question="What stage are you in?"
          error={errors.stage?.message ?? null}
          footer={footer}
        >
          <Controller
            control={form.control}
            name="stage"
            render={({ field }) => (
              <Radio.Group value={field.value ?? ''} onChange={field.onChange}>
                <Stack gap="xs">
                  {CAREER_STAGES.map((stage) => (
                    <Radio key={stage} value={stage} label={CAREER_STAGE_LABELS[stage]} />
                  ))}
                </Stack>
              </Radio.Group>
            )}
          />
        </QuestionShell>
      ) : null}

      {step === 1 ? (
        <QuestionShell
          stepIndex={1}
          totalSteps={TOTAL_STEPS}
          question="Which industry are you in or interested in?"
          hint="Choose as many as apply."
          error={errors.industries?.message ?? null}
          footer={footer}
        >
          <Controller
            control={form.control}
            name="industries"
            render={({ field }) => (
              <Checkbox.Group value={field.value} onChange={field.onChange}>
                <Stack gap="xs">
                  {ASSESSMENT_INDUSTRIES.map((industry) => (
                    <Checkbox key={industry} value={industry} label={industry} />
                  ))}
                </Stack>
              </Checkbox.Group>
            )}
          />
        </QuestionShell>
      ) : null}

      {step === 2 ? (
        <QuestionShell
          stepIndex={2}
          totalSteps={TOTAL_STEPS}
          question="What matters most to you when choosing a company?"
          hint={`Choose up to ${MAX_PRIORITY_ANSWERS}. We use this to recommend discussions on your home page.`}
          error={errors.priorities?.message ?? null}
          footer={footer}
        >
          <Controller
            control={form.control}
            name="priorities"
            render={({ field }) => {
              const atLimit = field.value.length >= MAX_PRIORITY_ANSWERS;
              return (
                <Checkbox.Group value={field.value} onChange={field.onChange}>
                  <Stack gap="xs">
                    {PRIORITIES.map((priority) => (
                      <Checkbox
                        key={priority}
                        value={priority}
                        label={PRIORITY_LABELS[priority]}
                        disabled={atLimit && !field.value.includes(priority)}
                      />
                    ))}
                  </Stack>
                </Checkbox.Group>
              );
            }}
          />
        </QuestionShell>
      ) : null}

      {step === 3 ? (
        <QuestionShell
          stepIndex={3}
          totalSteps={TOTAL_STEPS}
          question="What topics do you want to discuss?"
          hint="Posts with these tags appear in your home recommendations."
          error={errors.topics?.message ?? null}
          footer={footer}
        >
          <Controller
            control={form.control}
            name="topics"
            render={({ field }) => (
              <Checkbox.Group value={field.value} onChange={field.onChange}>
                <Stack gap="xs">
                  {ASSESSMENT_TOPIC_TAGS.map((tag) => (
                    <Checkbox key={tag} value={tag} label={`#${tag}`} />
                  ))}
                </Stack>
              </Checkbox.Group>
            )}
          />
        </QuestionShell>
      ) : null}

      {step === 4 ? (
        <QuestionShell
          stepIndex={4}
          totalSteps={TOTAL_STEPS}
          question="Any companies you're following?"
          hint="Optional. You can skip this and add companies later."
          optional
          footer={footer}
        >
          <Controller
            control={form.control}
            name="followedCompanyIds"
            render={({ field }) => (
              <Stack gap="sm">
                <CompanyPicker
                  label="Search companies to follow"
                  selectedIds={field.value}
                  emptyHint="Type a company name to search."
                  onSelect={(company) => {
                    if (field.value.includes(company.id)) {
                      field.onChange(field.value.filter((id) => id !== company.id));
                      setFollowed((current) => current.filter((item) => item.id !== company.id));
                    } else {
                      field.onChange([...field.value, company.id]);
                      setFollowed((current) => [...current, company]);
                    }
                  }}
                />

                {followed.length > 0 ? (
                  <Group gap="xs" wrap="wrap">
                    {followed.map((company) => (
                      <TagPill
                        key={company.id}
                        tag={company.name}
                        onRemove={() => {
                          field.onChange(field.value.filter((id) => id !== company.id));
                          setFollowed((current) =>
                            current.filter((item) => item.id !== company.id),
                          );
                        }}
                      />
                    ))}
                  </Group>
                ) : (
                  <Text size="sm" c="dimmed">
                    Not following any companies yet.
                  </Text>
                )}
              </Stack>
            )}
          />
        </QuestionShell>
      ) : null}

      {user && !user.hasCompletedAssessment ? (
        <Text size="xs" c="dimmed" ta="center" mt="lg">
          Signed in as {user.email}. The assessment takes about a minute and you can redo it any
          time from your profile.
        </Text>
      ) : null}
    </form>
  );
}
