/**
 * Mock company endpoints.
 *
 * Two behaviours here are the reason this must be a server, not client logic:
 *
 *   1. The privacy threshold. `aggregateUserReported` drops every aggregate
 *      below five eligible contributors *before* it is serialised, so the
 *      numbers never reach the browser (spec 3.5, 6.2, AC-6).
 *   2. The 90-day submission window. The client cannot be trusted to enforce
 *      it, so the rule lives here and the UI reflects what the server says
 *      (spec 6.5, 6.6, AC-7).
 */
import { http, HttpResponse } from 'msw';
import type {
  Company,
  CompanyProfile,
  CompanySubmission,
  CreateCompanyInput,
  MetricAreaId,
  SimilarCompanySuggestion,
  SubmissionEligibility,
  SubmissionHistoryEntry,
  SubmissionSections,
} from '@/shared/types/company';
import { INDUSTRIES, SENIORITY_LEVELS, seniorityRank } from '@/shared/types/common';
import { BENEFIT_OPTIONS, SUPPORT_PROGRAMS } from '@/shared/types/company';
import { SUBMISSION_WINDOW_DAYS } from '@/shared/config/constants';
import { containsBannedWord } from '@/shared/utils/tags';
import { nameSimilarity, normalizeCompanyName } from '@/shared/utils/text';
import type { FieldErrors } from '@/shared/api';
import { aggregateUserReported } from '../aggregations';
import { db, nextId, nowIso, persist } from '../db';
import {
  conflict,
  currentUser,
  notFound,
  paginate,
  readPagination,
  searchParam,
  simulateLatency,
  unauthorized,
  url,
  validationError,
} from '../helpers';

const WINDOW_MS = SUBMISSION_WINDOW_DAYS * 24 * 60 * 60 * 1000;

function buildProfile(company: Company): CompanyProfile {
  return {
    company,
    publicData: db().publicData[company.id] ?? {
      salary: null,
      promotion: null,
      diversity: null,
      benefits: null,
      maternity: null,
    },
    userReported: aggregateUserReported(db().submissions, company.id),
  };
}

function findCompany(companyId: string): Company | undefined {
  return db().companies.find((company) => company.id === companyId);
}

/** The user's current submission for a company, if any. */
function activeSubmissionFor(userId: string, companyId: string) {
  return db().submissions.find(
    (submission) =>
      submission.userId === userId &&
      submission.companyId === companyId &&
      submission.supersededAt === null,
  );
}

function toApiSubmission(submission: {
  id: string;
  companyId: string;
  sections: SubmissionSections;
  createdAt: string;
  updatedAt: string;
}): CompanySubmission {
  return {
    id: submission.id,
    companyId: submission.companyId,
    sections: submission.sections,
    createdAt: submission.createdAt,
    updatedAt: submission.updatedAt,
  };
}

/* -------------------------------------------------------------------------- */
/* Validation                                                                 */
/* -------------------------------------------------------------------------- */

const isPositiveInt = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value > 0;

const isNonNegativeInt = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0;

/**
 * A submission may contain any subset of the five sections, but a section that
 * is present must be complete (spec 6.4). Partial sections are rejected rather
 * than silently stored half-filled.
 */
function validateSections(sections: SubmissionSections): FieldErrors | null {
  const errors: FieldErrors = {};

  if (Object.keys(sections).length === 0) {
    return { form: ['Fill in at least one section before submitting.'] };
  }

  const { salary, promotion, diversity, benefits, maternity } = sections;

  if (salary) {
    if (!salary.role?.trim()) errors['salary.role'] = ['Choose a role.'];
    if (!SENIORITY_LEVELS.includes(salary.level)) errors['salary.level'] = ['Choose a level.'];
    if (!salary.city?.trim()) errors['salary.city'] = ['Choose a city.'];
    if (typeof salary.annualSalaryUsd !== 'number' || salary.annualSalaryUsd <= 0) {
      errors['salary.annualSalaryUsd'] = ['Please enter a number greater than 0.'];
    }
  }

  if (promotion) {
    if (!promotion.role?.trim()) errors['promotion.role'] = ['Choose a role.'];
    if (!SENIORITY_LEVELS.includes(promotion.fromLevel)) {
      errors['promotion.fromLevel'] = ['Choose a level.'];
    }
    if (!SENIORITY_LEVELS.includes(promotion.toLevel)) {
      errors['promotion.toLevel'] = ['Choose a level.'];
    }
    if (
      SENIORITY_LEVELS.includes(promotion.fromLevel) &&
      SENIORITY_LEVELS.includes(promotion.toLevel) &&
      seniorityRank(promotion.toLevel) <= seniorityRank(promotion.fromLevel)
    ) {
      errors['promotion.toLevel'] = ['The level after promotion must be higher than before.'];
    }
    if (!isPositiveInt(promotion.monthsToPromotion)) {
      errors['promotion.monthsToPromotion'] = ['Please enter a whole number of months.'];
    }
  }

  if (diversity) {
    if (!isPositiveInt(diversity.teamSize)) {
      errors['diversity.teamSize'] = ['Please enter a whole number greater than 0.'];
    }
    if (!isNonNegativeInt(diversity.womenOnTeam)) {
      errors['diversity.womenOnTeam'] = ['Please enter a whole number.'];
    } else if (isPositiveInt(diversity.teamSize) && diversity.womenOnTeam > diversity.teamSize) {
      errors['diversity.womenOnTeam'] = ['This cannot be more than the team size.'];
    }
    if (typeof diversity.managerIsWoman !== 'boolean') {
      errors['diversity.managerIsWoman'] = ['Choose Yes or No.'];
    }
    if (
      !Array.isArray(diversity.supportPrograms) ||
      diversity.supportPrograms.some((item) => !SUPPORT_PROGRAMS.includes(item))
    ) {
      errors['diversity.supportPrograms'] = ['Choose from the listed options.'];
    }
    if (!['yes', 'no', 'not_sure'].includes(diversity.trustsCompanyResponse)) {
      errors['diversity.trustsCompanyResponse'] = ['Choose one option.'];
    }
  }

  if (benefits) {
    if (!Array.isArray(benefits.benefits) || benefits.benefits.length === 0) {
      errors['benefits.benefits'] = ['Choose at least one benefit.'];
    } else if (benefits.benefits.some((item) => !BENEFIT_OPTIONS.includes(item))) {
      errors['benefits.benefits'] = ['Choose from the listed options.'];
    }
  }

  if (maternity) {
    if (!isNonNegativeInt(maternity.paidWeeks)) {
      errors['maternity.paidWeeks'] = ['Please enter a whole number of weeks.'];
    }
    if (
      typeof maternity.payPercent !== 'number' ||
      maternity.payPercent < 0 ||
      maternity.payPercent > 100
    ) {
      errors['maternity.payPercent'] = ['Please enter a number between 0 and 100.'];
    }
  }

  return Object.keys(errors).length > 0 ? errors : null;
}

function areasOf(sections: SubmissionSections): MetricAreaId[] {
  return (Object.keys(sections) as MetricAreaId[]).filter((area) => Boolean(sections[area]));
}

/* -------------------------------------------------------------------------- */
/* Handlers                                                                   */
/* -------------------------------------------------------------------------- */

export const companyHandlers = [
  /** Company search. Signed-in only (spec 2.2, AC-3). */
  http.get(url('/companies'), async ({ request }) => {
    await simulateLatency();
    if (!currentUser(request)) return unauthorized('Sign in to search companies.');

    const query = searchParam(request, 'q').toLowerCase();
    const { page, pageSize } = readPagination(request);

    const matches = query
      ? db().companies.filter(
          (company) =>
            company.name.toLowerCase().includes(query) ||
            normalizeCompanyName(company.name).includes(normalizeCompanyName(query)) ||
            company.industry.toLowerCase() === query,
        )
      : db().companies;

    const sorted = [...matches].sort((a, b) => a.name.localeCompare(b.name));
    return HttpResponse.json(paginate(sorted, page, pageSize));
  }),

  /** Near-duplicate suggestions while typing a new company name (spec 6.4). */
  http.get(url('/companies/name-suggestions'), async ({ request }) => {
    await simulateLatency(120);
    if (!currentUser(request)) return unauthorized();

    const name = searchParam(request, 'name');
    if (name.length < 2) return HttpResponse.json([] satisfies SimilarCompanySuggestion[]);

    const suggestions = db()
      .companies.map((company) => ({
        company,
        similarity: nameSimilarity(name, company.name),
      }))
      .filter((entry) => entry.similarity >= 0.4)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5);

    return HttpResponse.json(suggestions satisfies SimilarCompanySuggestion[]);
  }),

  /** Side-by-side payload for the comparison page. */
  http.get(url('/companies/compare'), async ({ request }) => {
    await simulateLatency();
    if (!currentUser(request)) return unauthorized('Sign in to compare companies.');

    const idA = searchParam(request, 'a');
    const idB = searchParam(request, 'b');

    const companyA = findCompany(idA);
    const companyB = findCompany(idB);
    if (!companyA || !companyB) return notFound('One of those companies does not exist.');
    if (idA === idB) return validationError('Choose two different companies to compare.');

    return HttpResponse.json({ a: buildProfile(companyA), b: buildProfile(companyB) });
  }),

  /** Add a company (spec 6.4). */
  http.post(url('/companies'), async ({ request }) => {
    await simulateLatency();
    if (!currentUser(request)) return unauthorized();

    const body = (await request.json()) as CreateCompanyInput;
    const errors: FieldErrors = {};

    const name = body.name?.trim() ?? '';
    if (name.length < 2) {
      errors['name'] = ['Enter the company name.'];
    } else if (containsBannedWord(name)) {
      errors['name'] = ['This name contains a word we do not allow.'];
    }

    const website = body.website?.trim() ?? '';
    let hostname = '';
    try {
      hostname = new URL(website).hostname.replace(/^www\./, '');
    } catch {
      errors['website'] = ['Enter a valid website, including https://'];
    }

    if (!INDUSTRIES.includes(body.industry)) errors['industry'] = ['Choose an industry.'];
    if (!body.headquartersCity?.trim()) errors['headquartersCity'] = ['Choose a city.'];

    // The website is the duplicate key: two records with the same hostname are
    // the same employer regardless of how the name is written.
    if (hostname) {
      const duplicate = db().companies.find((company) => {
        try {
          return new URL(company.website).hostname.replace(/^www\./, '') === hostname;
        } catch {
          return false;
        }
      });
      if (duplicate) {
        errors['website'] = [`${duplicate.name} already uses this website.`];
      }
    }

    if (Object.keys(errors).length > 0) {
      return validationError('Please fix the highlighted fields.', errors);
    }

    const company: Company = {
      id: nextId('company'),
      name,
      website,
      industry: body.industry,
      headquartersCity: body.headquartersCity.trim(),
      isDemoFixture: true,
    };

    db().companies.push(company);
    // A newly added company has no curated public data until the team adds it.
    db().publicData[company.id] = {
      salary: null,
      promotion: null,
      diversity: null,
      benefits: null,
      maternity: null,
    };
    persist();

    return HttpResponse.json(company, { status: 201 });
  }),

  /** Full company profile. */
  http.get(url('/companies/:companyId'), async ({ request, params }) => {
    await simulateLatency();
    if (!currentUser(request)) return unauthorized('Sign in to view company data.');

    const company = findCompany(String(params['companyId']));
    if (!company) return notFound('We do not have this company yet.');

    return HttpResponse.json(buildProfile(company));
  }),

  /** Whether the user may create a new submission, or must edit the existing one. */
  http.get(url('/companies/:companyId/my-submission'), async ({ request, params }) => {
    await simulateLatency(140);
    const user = currentUser(request);
    if (!user) return unauthorized();

    const companyId = String(params['companyId']);
    if (!findCompany(companyId)) return notFound();

    const existing = activeSubmissionFor(user.id, companyId);
    if (!existing) {
      return HttpResponse.json({
        canCreateNew: true,
        existingSubmission: null,
        nextSubmissionAllowedAt: null,
      } satisfies SubmissionEligibility);
    }

    // The window runs from the FIRST submission. Editing never restarts it.
    const windowEnds = new Date(existing.createdAt).getTime() + WINDOW_MS;
    const canCreateNew = Date.now() >= windowEnds;

    return HttpResponse.json({
      canCreateNew,
      existingSubmission: toApiSubmission(existing),
      nextSubmissionAllowedAt: canCreateNew ? null : new Date(windowEnds).toISOString(),
    } satisfies SubmissionEligibility);
  }),

  /** Create a submission (spec 6.5, AC-7). */
  http.post(url('/companies/:companyId/submissions'), async ({ request, params }) => {
    await simulateLatency();
    const user = currentUser(request);
    if (!user) return unauthorized();

    const companyId = String(params['companyId']);
    if (!findCompany(companyId)) return notFound();

    const sections = (await request.json()) as SubmissionSections;
    const errors = validateSections(sections);
    if (errors) return validationError('Please fix the highlighted fields.', errors);

    const existing = activeSubmissionFor(user.id, companyId);
    if (existing) {
      const windowEnds = new Date(existing.createdAt).getTime() + WINDOW_MS;
      if (Date.now() < windowEnds) {
        return conflict(
          'You already shared data for this company in the last 90 days. You can edit that submission instead.',
        );
      }
      // Past the window: the new submission replaces the old one in the
      // aggregates, and the old one is kept as history (spec 6.6).
      existing.supersededAt = nowIso();
    }

    const now = nowIso();
    const submission = {
      id: nextId('sub'),
      companyId,
      userId: user.id,
      sections,
      createdAt: now,
      updatedAt: now,
      supersededAt: null,
    };

    db().submissions.push(submission);
    persist();

    return HttpResponse.json(toApiSubmission(submission), { status: 201 });
  }),

  /** Edit an existing submission. Does not restart the 90-day window. */
  http.put(url('/companies/:companyId/submissions/:submissionId'), async ({ request, params }) => {
    await simulateLatency();
    const user = currentUser(request);
    if (!user) return unauthorized();

    const submissionId = String(params['submissionId']);
    const submission = db().submissions.find((item) => item.id === submissionId);
    if (!submission) return notFound('That submission no longer exists.');

    // Ownership is checked on the server. A client-side check is not security.
    if (submission.userId !== user.id) {
      return notFound('That submission no longer exists.');
    }

    const sections = (await request.json()) as SubmissionSections;
    const errors = validateSections(sections);
    if (errors) return validationError('Please fix the highlighted fields.', errors);

    submission.sections = sections;
    submission.updatedAt = nowIso();
    persist();

    return HttpResponse.json(toApiSubmission(submission));
  }),

  /** The signed-in user's contribution history, shown on Profile. */
  http.get(url('/me/submissions'), async ({ request }) => {
    await simulateLatency(140);
    const user = currentUser(request);
    if (!user) return unauthorized();

    const entries: SubmissionHistoryEntry[] = db()
      .submissions.filter((submission) => submission.userId === user.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((submission) => ({
        id: submission.id,
        companyId: submission.companyId,
        companyName: findCompany(submission.companyId)?.name ?? 'Unknown company',
        areas: areasOf(submission.sections),
        createdAt: submission.createdAt,
        updatedAt: submission.updatedAt,
        isSuperseded: submission.supersededAt !== null,
      }));

    return HttpResponse.json(entries);
  }),
];
