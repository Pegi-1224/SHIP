/**
 * Every route path in the app, in one place.
 *
 * These are plain string builders with no React or router dependency, which is
 * why they live in `shared/` rather than `app/router/`: links are needed by
 * shared components and by every feature, and `shared/` must not import from
 * `features/` or reach upward into `app/`.
 *
 * `app/router/routes.tsx` defines the matching route elements. When you add a
 * route, add it here first, then wire the element there, then document it in
 * the README route table.
 */

export const routePatterns = {
  home: '/',
  login: '/login',
  assessment: '/assessment',
  companies: '/companies',
  companyNew: '/companies/new',
  companyDetail: '/companies/:companyId',
  companySubmit: '/companies/:companyId/submit',
  compare: '/compare',
  discussions: '/discussions',
  discussionNew: '/discussions/new',
  discussionDetail: '/discussions/:postId',
  discussionEdit: '/discussions/:postId/edit',
  messages: '/messages',
  conversation: '/messages/:conversationId',
  profile: '/profile',
  notFound: '*',
} as const;

export const paths = {
  home: () => '/',
  login: () => '/login',
  /** `?redirectTo=` sends the user back where they were after signing in. */
  loginWithRedirect: (redirectTo: string) =>
    `/login?redirectTo=${encodeURIComponent(redirectTo)}`,
  assessment: () => '/assessment',

  companies: () => '/companies',
  companiesSearch: (query: string) =>
    query ? `/companies?q=${encodeURIComponent(query)}` : '/companies',
  companyNew: () => '/companies/new',
  /** `name` pre-fills the add-company form from a failed search (spec 6.5). */
  companyNewWithName: (name: string) =>
    name ? `/companies/new?name=${encodeURIComponent(name)}` : '/companies/new',
  companyDetail: (companyId: string) => `/companies/${companyId}`,
  companySubmit: (companyId: string) => `/companies/${companyId}/submit`,
  /** `area` opens the form scrolled to one section, from a "Share your data" button. */
  companySubmitArea: (companyId: string, area: string) =>
    `/companies/${companyId}/submit?area=${encodeURIComponent(area)}`,

  compare: () => '/compare',
  compareCompanies: (companyIdA: string, companyIdB?: string) =>
    companyIdB ? `/compare?a=${companyIdA}&b=${companyIdB}` : `/compare?a=${companyIdA}`,

  discussions: () => '/discussions',
  discussionsWithTag: (tag: string) => `/discussions?tag=${encodeURIComponent(tag)}`,
  discussionsSearch: (query: string) =>
    query ? `/discussions?q=${encodeURIComponent(query)}` : '/discussions',
  discussionNew: () => '/discussions/new',
  discussionDetail: (postId: string) => `/discussions/${postId}`,
  discussionEdit: (postId: string) => `/discussions/${postId}/edit`,

  messages: () => '/messages',
  conversation: (conversationId: string) => `/messages/${conversationId}`,

  profile: () => '/profile',
} as const;
