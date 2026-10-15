import { Route, Routes } from 'react-router-dom';
import { routePatterns } from '@/shared/config/paths';
import { AppLayout } from '@/app/layouts/AppLayout';
import { LoginPage } from '@/features/auth';
import { AssessmentPage } from '@/features/onboarding';
import { HomePage } from '@/features/home';
import {
  CompanyProfilePage,
  CompanySearchPage,
  CompanySubmitPage,
  ComparePage,
  NewCompanyPage,
} from '@/features/companies';
import {
  DiscussionsPage,
  EditPostPage,
  NewPostPage,
  PostDetailPage,
} from '@/features/discussions';
import { ConversationListPage, ConversationPage } from '@/features/messages';
import { ProfilePage } from '@/features/profile';
import { RedirectIfAuthenticated } from './guards';
import { NotFoundPage } from './NotFoundPage';

/**
 * The route map. See the README route table for the same information plus the
 * access rules in prose.
 *
 * TEMPORARY, DOCUMENTED STATE (see docs/decisions-and-questions.md DQ-19):
 * every route below except `/login` is currently reachable by anyone,
 * signed in or not, with or without a completed assessment. This is not a
 * production access model - it is true only because every one of these
 * routes is a `StarterPage` placeholder with no real data, no form and
 * nothing to protect yet. Making every placeholder require the dev sign-in +
 * dev-complete-assessment dance just to read a sentence of future-page intent
 * was worse than the alternative: a reviewer going link by link through the
 * Home dev index had to repeat that dance (or hit `/login`) for every single
 * route.
 *
 * `RequireAuth` and `RequireAssessment` (`./guards.tsx`) are untouched and
 * fully functional - they are simply not applied to any route right now.
 * REINSTATE THE GUARD a route needs, the moment that route's `StarterPage` is
 * replaced with a real page that fetches or submits real data:
 *
 *   wrap it like this                              → the route needs
 *   <Route element={<RequireAuth />}>                 a session
 *     <Route path={...} element={<RealPage />} />
 *   </Route>
 *
 *   <Route element={<RequireAuth />}>                 a session AND a
 *     <Route element={<RequireAssessment />}>          completed assessment
 *       <Route path={...} element={<RealPage />} />
 *     </Route>
 *   </Route>
 *
 * The table below says which guard each route will need once it is real.
 * `guards.test.tsx` exercises both guard components directly (outside this
 * router) so their redirect behaviour stays covered by a test even while
 * neither is wired into a route here.
 *
 * `/login` keeps `RedirectIfAuthenticated`: an already-signed-in user landing
 * on the sign-in form (e.g. via Back) is a real, present-day situation, unlike
 * the others, so that guard stays applied.
 */
export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        {/* Public, and stays public once implemented. */}
        <Route path={routePatterns.home} element={<HomePage />} />

        <Route element={<RedirectIfAuthenticated />}>
          <Route path={routePatterns.login} element={<LoginPage />} />
        </Route>

        {/* Will need: RequireAuth (a session, but not necessarily the
            assessment - /profile must stay reachable so an account is never
            trapped, and /assessment cannot be gated by RequireAssessment
            without creating a redirect loop). */}
        <Route path={routePatterns.assessment} element={<AssessmentPage />} />
        <Route path={routePatterns.profile} element={<ProfilePage />} />

        {/* Will need: RequireAuth + RequireAssessment. */}
        <Route path={routePatterns.companies} element={<CompanySearchPage />} />
        <Route path={routePatterns.companyNew} element={<NewCompanyPage />} />
        <Route path={routePatterns.companyDetail} element={<CompanyProfilePage />} />
        <Route path={routePatterns.companySubmit} element={<CompanySubmitPage />} />
        <Route path={routePatterns.compare} element={<ComparePage />} />

        <Route path={routePatterns.discussions} element={<DiscussionsPage />} />
        <Route path={routePatterns.discussionNew} element={<NewPostPage />} />
        <Route path={routePatterns.discussionDetail} element={<PostDetailPage />} />
        <Route path={routePatterns.discussionEdit} element={<EditPostPage />} />

        <Route path={routePatterns.messages} element={<ConversationListPage />} />
        <Route path={routePatterns.conversation} element={<ConversationPage />} />

        <Route path={routePatterns.notFound} element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
