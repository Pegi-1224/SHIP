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
import { RedirectIfAuthenticated, RequireAssessment, RequireAuth } from './guards';
import { NotFoundPage } from './NotFoundPage';

/**
 * The route map. See the README route table for the same information plus the
 * access rules in prose.
 *
 * Nesting, outermost first:
 *   AppLayout              chrome for every page
 *     public               /, /login, 404
 *     RequireAuth          needs a session
 *       /assessment        deliberately OUTSIDE RequireAssessment
 *       /profile           always reachable, so an account is never trapped
 *       RequireAssessment  needs the assessment finished
 *         everything else
 *
 * Why there is no redirect loop: `/assessment` is the only place
 * `RequireAssessment` sends people, and that route is not itself gated by it.
 * `/` is never gated, so a signed-in user with an unfinished assessment sees a
 * prompt there rather than being bounced.
 */
export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        {/* Public */}
        <Route path={routePatterns.home} element={<HomePage />} />

        <Route element={<RedirectIfAuthenticated />}>
          <Route path={routePatterns.login} element={<LoginPage />} />
        </Route>

        {/* Signed in */}
        <Route element={<RequireAuth />}>
          <Route path={routePatterns.assessment} element={<AssessmentPage />} />
          <Route path={routePatterns.profile} element={<ProfilePage />} />

          {/* Signed in and assessment finished */}
          <Route element={<RequireAssessment />}>
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
          </Route>
        </Route>

        <Route path={routePatterns.notFound} element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
