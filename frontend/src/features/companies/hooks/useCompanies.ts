/**
 * Company queries and mutations.
 *
 * Hooks own caching and invalidation; the API functions below them own HTTP.
 * After any submission the company detail, comparison and contribution-history
 * caches are invalidated, which is what makes a newly crossed privacy
 * threshold appear without a page reload (spec 6.6, AC-6).
 */
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/shared/api';
import type { DemoReport } from '@/shared/utils/demoReports';
import type {
  CompanySearchParams,
  CreateCompanyInput,
  SubmissionSections,
} from '@/shared/types/company';
import {
  createCompany,
  createSubmission,
  fetchCompanyProfile,
  fetchComparison,
  fetchMySubmissions,
  fetchSimilarCompanies,
  fetchSubmissionEligibility,
  searchCompanies,
  searchDemoCompanies,
  fetchDemoCompany,
  submitDemoReport,
  updateSubmission,
} from '../api/companiesApi';

export function useCompanySearch(params: CompanySearchParams, enabled = true) {
  return useQuery({
    queryKey: queryKeys.companies.search(params),
    queryFn: ({ signal }) => searchCompanies(params, signal),
    enabled,
  });
}

/** Live demo search; `keepPreviousData` stops the list flashing empty between keystrokes. */
export function useDemoCompanySearch(q: string) {
  return useQuery({
    queryKey: queryKeys.demoSearch.companies(q),
    queryFn: ({ signal }) => searchDemoCompanies(q, signal),
    placeholderData: keepPreviousData,
  });
}

export function useDemoCompany(companyId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.demoSearch.company(companyId ?? ''),
    queryFn: ({ signal }) => fetchDemoCompany(companyId as string, signal),
    enabled: Boolean(companyId),
  });
}

/** Shows the new aggregates straight away, then refreshes the search results too. */
export function useSubmitDemoReport(companyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (report: DemoReport) => submitDemoReport(companyId, report),
    onSuccess: async (result) => {
      queryClient.setQueryData(queryKeys.demoSearch.company(companyId), result.company);
      await queryClient.invalidateQueries({ queryKey: queryKeys.demoSearch.all });
    },
  });
}

export function useCompanyProfile(companyId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.companies.detail(companyId ?? ''),
    queryFn: ({ signal }) => fetchCompanyProfile(companyId as string, signal),
    enabled: Boolean(companyId),
  });
}

export function useComparison(companyIdA: string | null, companyIdB: string | null) {
  return useQuery({
    queryKey: queryKeys.companies.comparison(companyIdA ?? '', companyIdB ?? ''),
    queryFn: ({ signal }) => fetchComparison(companyIdA as string, companyIdB as string, signal),
    enabled: Boolean(companyIdA && companyIdB && companyIdA !== companyIdB),
  });
}

/** Type-ahead duplicate check for the add-company form (spec 6.4). */
export function useSimilarCompanies(name: string) {
  return useQuery({
    queryKey: queryKeys.companies.nameSuggestions(name),
    queryFn: ({ signal }) => fetchSimilarCompanies(name, signal),
    enabled: name.trim().length >= 2,
    staleTime: 60_000,
  });
}

export function useCreateCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateCompanyInput) => createCompany(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.companies.all }),
  });
}

export function useSubmissionEligibility(companyId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.companies.mySubmission(companyId ?? ''),
    queryFn: ({ signal }) => fetchSubmissionEligibility(companyId as string, signal),
    enabled: Boolean(companyId),
  });
}

export interface SubmitCompanyDataInput {
  sections: SubmissionSections;
  /** Set when editing an existing submission rather than creating one. */
  submissionId?: string | undefined;
}

/**
 * Creates or updates a company-data submission.
 *
 * Both paths invalidate the same caches, because either one changes the
 * aggregates the profile and comparison pages display.
 */
export function useSubmitCompanyData(companyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ sections, submissionId }: SubmitCompanyDataInput) =>
      submissionId
        ? updateSubmission(companyId, submissionId, sections)
        : createSubmission(companyId, sections),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.companies.detail(companyId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.companies.mySubmission(companyId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.companies.mySubmissionHistory }),
        // Any open comparison involving this company is now stale.
        queryClient.invalidateQueries({
          predicate: (query) =>
            query.queryKey[0] === 'companies' && query.queryKey[1] === 'comparison',
        }),
        queryClient.invalidateQueries({ queryKey: queryKeys.profile.activity }),
      ]);
    },
  });
}

export function useMySubmissions() {
  return useQuery({
    queryKey: queryKeys.companies.mySubmissionHistory,
    queryFn: ({ signal }) => fetchMySubmissions(signal),
  });
}
