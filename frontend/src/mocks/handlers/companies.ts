/**
 * Mock company endpoints.
 *
 * Why this must be a server, not client logic: the privacy threshold.
 * `aggregateUserReported` drops every aggregate below five eligible contributors
 * *before* it is serialised, so the numbers never reach the browser (spec 3.5, 6.2, AC-6).
 */
import { http, HttpResponse } from 'msw';
import type {
  Company,
  CompanyProfile,
  CreateCompanyInput,
  MetricAreaId,
  SimilarCompanySuggestion,
  SubmissionHistoryEntry,
  SubmissionSections,
} from '@/shared/types/company';
import { INDUSTRIES } from '@/shared/types/common';
import { containsBannedWord } from '@/shared/utils/tags';
import { nameSimilarity, normalizeCompanyName } from '@/shared/utils/text';
import type { FieldErrors } from '@/shared/api';
import { aggregateUserReported } from '../aggregations';
import { db, nextId, persist } from '../db';
import {
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
