/**
 * Every TanStack Query cache key in the app.
 *
 * Keeping them in one file makes invalidation after a mutation obvious and
 * stops two features inventing different keys for the same resource. Keys are
 * arrays ordered broad to narrow, so
 * `invalidateQueries({ queryKey: queryKeys.companies.all })` clears everything
 * company-related in a single call.
 */
import type { CompanySearchParams } from '@/shared/types/company';
import type { PostListParams } from '@/shared/types/discussion';

export const queryKeys = {
  session: {
    current: ['session', 'current'] as const,
  },
  assessment: {
    all: ['assessment'] as const,
    mine: ['assessment', 'mine'] as const,
  },
  companies: {
    all: ['companies'] as const,
    search: (params: CompanySearchParams) => ['companies', 'search', params] as const,
    detail: (companyId: string) => ['companies', 'detail', companyId] as const,
    comparison: (companyIdA: string, companyIdB: string) =>
      ['companies', 'comparison', companyIdA, companyIdB] as const,
    mySubmission: (companyId: string) => ['companies', 'my-submission', companyId] as const,
    nameSuggestions: (name: string) => ['companies', 'name-suggestions', name] as const,
    mySubmissionHistory: ['companies', 'my-submission-history'] as const,
  },
  discussions: {
    all: ['discussions'] as const,
    posts: (params: PostListParams) => ['discussions', 'posts', params] as const,
    post: (postId: string) => ['discussions', 'post', postId] as const,
    comments: (postId: string) => ['discussions', 'comments', postId] as const,
    tags: (search: string) => ['discussions', 'tags', search] as const,
  },
  demoSearch: {
    all: ['demo-search'] as const,
    companies: (q: string) => ['demo-search', 'companies', q] as const,
    company: (companyId: string) => ['demo-search', 'company', companyId] as const,
    posts: (q: string) => ['demo-search', 'posts', q] as const,
  },
  home: {
    all: ['home'] as const,
    recommendations: ['home', 'recommendations'] as const,
    publicPreview: ['home', 'public-preview'] as const,
  },
  messages: {
    all: ['messages'] as const,
    conversations: ['messages', 'conversations'] as const,
    conversation: (conversationId: string) => ['messages', 'conversation', conversationId] as const,
  },
  profile: {
    all: ['profile'] as const,
    activity: ['profile', 'activity'] as const,
    posts: ['profile', 'posts'] as const,
    comments: ['profile', 'comments'] as const,
  },
} as const;
