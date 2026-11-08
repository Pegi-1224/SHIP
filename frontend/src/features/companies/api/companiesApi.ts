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
  CreateCompanyInput,
  SimilarCompanySuggestion,
  SubmissionHistoryEntry,
} from '@/shared/types/company';
import type { CompanyRecord, SearchHit } from '@/shared/types/demoSearch';
import type { DemoReport } from '@/shared/utils/demoReports';
import type { NewCompanyInput } from '@/shared/types/companySubmission';

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

export function fetchMySubmissions(signal?: AbortSignal): Promise<SubmissionHistoryEntry[]> {
  return api.get<SubmissionHistoryEntry[]>('/me/submissions', { signal });
}

/** Demo company search over `src/mocks/data/companies.json`. Public, so it works on Home. */
export function searchDemoCompanies(
  q: string,
  signal?: AbortSignal,
): Promise<{ items: SearchHit<CompanyRecord>[]; total: number }> {
  return api.get('/demo/companies', { query: { q }, auth: false, signal });
}

/** Companies whose name matches what has been typed, names starting with it first. */
export function suggestDemoCompanyNames(
  q: string,
  signal?: AbortSignal,
): Promise<{ items: SearchHit<CompanyRecord>[]; total: number }> {
  return api.get('/demo/companies', { query: { q, mode: 'names' }, auth: false, signal });
}

export function fetchDemoCompany(companyId: string, signal?: AbortSignal): Promise<CompanyRecord> {
  return api.get(`/demo/companies/${encodeURIComponent(companyId)}`, { auth: false, signal });
}

export interface DemoReportResult {
  company: CompanyRecord;
  /** False when no dev server could write companies.json; the report lasts until reload. */
  savedToFile: boolean;
}

/** "Add a company": the new company plus the user's answers, as the signed-in user. */
export function createDemoCompany(input: NewCompanyInput): Promise<DemoReportResult> {
  return api.post('/demo/companies', input);
}

/** One user report from the company page ("Be the first" / "Add yours"). */
export function submitDemoReport(companyId: string, report: DemoReport): Promise<DemoReportResult> {
  return api.post(`/demo/companies/${encodeURIComponent(companyId)}/reports`, report, {
    auth: false,
  });
}
