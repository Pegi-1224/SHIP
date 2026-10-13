/**
 * Submission validation rules (spec 6.4).
 *
 * The rule under test is "any subset of sections, but a chosen section must be
 * complete". These cases pin that down without driving the form UI.
 */
import { describe, expect, it } from 'vitest';
import {
  emptySubmissionForm,
  fromSubmissionSections,
  submissionFormSchema,
  toSubmissionSections,
  type SubmissionFormValues,
} from './submissionSchema';

function form(overrides: Partial<SubmissionFormValues>): SubmissionFormValues {
  return { ...emptySubmissionForm, ...overrides };
}

function errorsFor(values: SubmissionFormValues): string[] {
  const result = submissionFormSchema.safeParse(values);
  if (result.success) return [];
  return result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
}

describe('submissionFormSchema', () => {
  it('rejects a submission with no section switched on', () => {
    expect(errorsFor(emptySubmissionForm)).toContain(
      'enabled: Choose at least one section to fill in.',
    );
  });

  it('accepts a single complete section and ignores the empty ones', () => {
    const values = form({
      enabled: { ...emptySubmissionForm.enabled, maternity: true },
      maternity: { paidWeeks: 16, payPercent: 100 },
    });

    expect(errorsFor(values)).toEqual([]);
  });

  it('requires every field inside a section that is switched on', () => {
    const values = form({
      enabled: { ...emptySubmissionForm.enabled, salary: true },
      salary: { role: 'Software Engineer', level: '', city: '', annualSalaryUsd: '' },
    });

    const errors = errorsFor(values);
    expect(errors).toContain('salary.level: Choose your level.');
    expect(errors).toContain('salary.city: Choose your city.');
    expect(errors).toContain('salary.annualSalaryUsd: Please enter a number greater than 0.');
    // The role that was filled in is not complained about.
    expect(errors.some((error) => error.startsWith('salary.role'))).toBe(false);
  });

  it('never validates a section the user left switched off', () => {
    const values = form({
      enabled: { ...emptySubmissionForm.enabled, maternity: true },
      maternity: { paidWeeks: 16, payPercent: 100 },
      // Half-filled, but switched off, so irrelevant.
      salary: { role: 'Designer', level: '', city: '', annualSalaryUsd: '' },
    });

    expect(errorsFor(values)).toEqual([]);
  });

  it('requires a promotion to move upwards', () => {
    const values = form({
      enabled: { ...emptySubmissionForm.enabled, promotion: true },
      promotion: {
        role: 'Software Engineer',
        fromLevel: 'Senior',
        toLevel: 'Mid',
        monthsToPromotion: 18,
      },
    });

    expect(errorsFor(values)).toContain(
      'promotion.toLevel: The level after promotion must be higher than the level before.',
    );
  });

  it('rejects more women on a team than there are people on it', () => {
    const values = form({
      enabled: { ...emptySubmissionForm.enabled, diversity: true },
      diversity: {
        teamSize: 4,
        womenOnTeam: 9,
        managerIsWoman: 'yes',
        supportPrograms: [],
        trustsCompanyResponse: 'yes',
      },
    });

    expect(errorsFor(values)).toContain(
      'diversity.womenOnTeam: This cannot be more than the team size.',
    );
  });

  it('keeps the pay percentage between 0 and 100', () => {
    const values = form({
      enabled: { ...emptySubmissionForm.enabled, maternity: true },
      maternity: { paidWeeks: 16, payPercent: 140 },
    });

    expect(errorsFor(values)).toContain(
      'maternity.payPercent: Please enter a number between 0 and 100.',
    );
  });

  it('accepts a salary of any size but not zero or below', () => {
    const base = {
      enabled: { ...emptySubmissionForm.enabled, salary: true },
      salary: { role: 'Designer', level: 'Mid', city: 'Austin, TX', annualSalaryUsd: 0 },
    };

    expect(errorsFor(form(base))).toContain(
      'salary.annualSalaryUsd: Please enter a number greater than 0.',
    );
    expect(
      errorsFor(form({ ...base, salary: { ...base.salary, annualSalaryUsd: 1 } })),
    ).toEqual([]);
  });
});

describe('form <-> API conversion', () => {
  it('only sends the sections that were switched on', () => {
    const values = form({
      enabled: { ...emptySubmissionForm.enabled, maternity: true, benefits: true },
      maternity: { paidWeeks: 12, payPercent: 60 },
      benefits: { benefits: ['health_insurance', 'not_a_real_benefit'] },
      salary: { role: 'Designer', level: 'Mid', city: 'Austin, TX', annualSalaryUsd: 120_000 },
    });

    const sections = toSubmissionSections(values);

    expect(Object.keys(sections).sort()).toEqual(['benefits', 'maternity']);
    // Unknown values are dropped rather than forwarded to the backend.
    expect(sections.benefits?.benefits).toEqual(['health_insurance']);
  });

  it('round-trips an existing submission back into the form', () => {
    const sections = {
      salary: {
        role: 'Software Engineer',
        level: 'Senior' as const,
        city: 'Seattle, WA',
        annualSalaryUsd: 170_000,
      },
    };

    const values = fromSubmissionSections(sections);

    expect(values.enabled.salary).toBe(true);
    expect(values.enabled.maternity).toBe(false);
    expect(values.salary.annualSalaryUsd).toBe(170_000);
    expect(toSubmissionSections(values)).toEqual(sections);
  });
});
