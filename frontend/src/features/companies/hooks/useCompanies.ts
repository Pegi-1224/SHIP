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
import type { NewCompanyInput } from '@/shared/types/companySubmission';
import type { CompanySearchParams, CreateCompanyInput } from '@/shared/types/company';
import {
  createCompany,
  fetchCompanyProfile,
  fetchComparison,
  fetchMySubmissions,
  fetchSimilarCompanies,
  searchCompanies,
  searchDemoCompanies,
  suggestDemoCompanyNames,
  fetchDemoCompany,
  submitDemoReport,
  createDemoCompany,
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

/** Name autocomplete for "Add this company". Nothing is fetched until something is typed. */
export function useDemoCompanyNameSuggestions(q: string) {
  return useQuery({
    queryKey: queryKeys.demoSearch.companyNames(q),
    queryFn: ({ signal }) => suggestDemoCompanyNames(q, signal),
    enabled: q.length > 0,
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

/** Adds a company with the user's answers; the new company shows in every search. */
export function useCreateDemoCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: NewCompanyInput) => createDemoCompany(input),
    onSuccess: async (result) => {
      queryClient.setQueryData(queryKeys.demoSearch.company(result.company.id), result.company);
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

export function useMySubmissions() {
  return useQuery({
    queryKey: queryKeys.companies.mySubmissionHistory,
    queryFn: ({ signal }) => fetchMySubmissions(signal),
  });
}
