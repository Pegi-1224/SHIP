/**
 * Company API functions.
 *
 * Each one is a thin wrapper over the shared client: build the path, pass the
 * abort signal through, and return the typed response. No React, no caching -
 * that is the hooks' job - which keeps these callable from tests directly.
 */
import { api } from '@/shared/api';
import type { Paginated } from '@/shared/types/common';
import type {
  Company,
  CompanyProfile,
  CompanySearchParams,
  CompanySubmission,
  CreateCompanyInput,
  SimilarCompanySuggestion,
  SubmissionEligibility,
  SubmissionHistoryEntry,
  SubmissionSections,
} from '@/shared/types/company';

export function searchCompanies(
  params: CompanySearchParams,
  signal?: AbortSignal,
): Promise<Paginated<Company>> {
  return api.get<Paginated<Company>>('/companies', {
    query: { q: params.q, page: params.page, pageSize: params.pageSize },
    signal,
  });
}

export function fetchCompanyProfile(
  companyId: string,
  signal?: AbortSignal,
): Promise<CompanyProfile> {
  return api.get<CompanyProfile>(`/companies/${encodeURIComponent(companyId)}`, { signal });
}

/** Both sides of a comparison in one request, so the two are always consistent. */
export function fetchComparison(
  companyIdA: string,
  companyIdB: string,
  signal?: AbortSignal,
): Promise<{ a: CompanyProfile; b: CompanyProfile }> {
  return api.get<{ a: CompanyProfile; b: CompanyProfile }>('/companies/compare', {
    query: { a: companyIdA, b: companyIdB },
    signal,
  });
}

export function fetchSimilarCompanies(
  name: string,
  signal?: AbortSignal,
): Promise<SimilarCompanySuggestion[]> {
  return api.get<SimilarCompanySuggestion[]>('/companies/name-suggestions', {
    query: { name },
    signal,
  });
}

export function createCompany(input: CreateCompanyInput): Promise<Company> {
  return api.post<Company>('/companies', input);
}

/** Whether the user may add a new submission, or must edit the existing one. */
export function fetchSubmissionEligibility(
  companyId: string,
  signal?: AbortSignal,
): Promise<SubmissionEligibility> {
  return api.get<SubmissionEligibility>(
    `/companies/${encodeURIComponent(companyId)}/my-submission`,
    { signal },
  );
}

export function createSubmission(
  companyId: string,
  sections: SubmissionSections,
): Promise<CompanySubmission> {
  return api.post<CompanySubmission>(
    `/companies/${encodeURIComponent(companyId)}/submissions`,
    sections,
  );
}

export function updateSubmission(
  companyId: string,
  submissionId: string,
  sections: SubmissionSections,
): Promise<CompanySubmission> {
  return api.put<CompanySubmission>(
    `/companies/${encodeURIComponent(companyId)}/submissions/${encodeURIComponent(submissionId)}`,
    sections,
  );
}

export function fetchMySubmissions(signal?: AbortSignal): Promise<SubmissionHistoryEntry[]> {
  return api.get<SubmissionHistoryEntry[]>('/me/submissions', { signal });
}
