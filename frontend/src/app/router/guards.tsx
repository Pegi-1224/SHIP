import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { LoadingState } from '@/shared/ui';
import { paths } from '@/shared/config/paths';
import { useAuth } from '@/app/providers/useAuth';

/**
 * ROUTE GUARDS ARE A NAVIGATION AID, NOT ACCESS CONTROL.
 *
 * Everything in this bundle runs on the user's machine and can be bypassed.
 * The backend must authorise every request on its own: reject reads the viewer
 * may not perform, reject writes to records they do not own, and withhold
 * aggregates that sit below the privacy threshold. These guards only save the
 * user from landing on a page that would fail.
 *
 * The two guards are deliberately separate and never redirect to each other,
 * so there is no loop:
 *   - `RequireAuth` sends signed-out users to /login with a `redirectTo`.
 *   - `RequireAssessment` sends signed-in users who have not finished the
 *     assessment to /assessment. It is only ever nested inside `RequireAuth`,
 *     and /assessment itself sits outside it.
 */

/** Blocks the route until a session exists. */
export function RequireAuth() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return <LoadingState label="Checking your session…" />;
  }

  if (status === 'unauthenticated') {
    const redirectTo = `${location.pathname}${location.search}`;
    return <Navigate to={paths.loginWithRedirect(redirectTo)} replace />;
  }

  return <Outlet />;
}

/**
 * Blocks the route until the onboarding assessment is complete (spec 3.3).
 * Always nested inside `RequireAuth`, so the session is known to exist here.
 */
export function RequireAssessment() {
  const { hasCompletedAssessment } = useAuth();

  if (!hasCompletedAssessment) {
    return <Navigate to={paths.assessment()} replace />;
  }

  return <Outlet />;
}

/**
 * Keeps signed-in users off /login. Without this, finishing sign-in and then
 * pressing Back would land on a sign-in form for an active session.
 */
export function RedirectIfAuthenticated() {
  const { status } = useAuth();

  if (status === 'loading') {
    return <LoadingState label="Checking your session…" />;
  }

  if (status === 'authenticated') {
    return <Navigate to={paths.home()} replace />;
  }

  return <Outlet />;
}
