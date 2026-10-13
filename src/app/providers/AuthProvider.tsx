import { useCallback, useEffect, useMemo, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { clearAuthToken, queryKeys, setUnauthorizedHandler } from '@/shared/api';
import { fetchSession } from '@/features/auth';
import { AuthContext, type AuthContextValue, type AuthStatus } from './authContext';

/**
 * Owns "who is signed in" for the whole app.
 *
 * The session itself is a TanStack Query, so it benefits from the same caching
 * and refetching as any other server state; this context only exposes it in a
 * convenient shape and registers the single global 401 handler.
 *
 * Route guards read this. They exist for navigation and UX only - a guard in
 * the browser is not access control. The backend must authorise every request
 * independently.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const sessionQuery = useQuery({
    queryKey: queryKeys.session.current,
    queryFn: ({ signal }) => fetchSession(signal),
    // A signed-out user is a valid answer, so do not retry it as a failure.
    retry: false,
    staleTime: 30_000,
  });

  /**
   * Drops the local session.
   *
   * It deliberately does NOT remove other cached queries. Removing an *active*
   * query puts it straight back into a pending state, which refetches, gets
   * another 401, and clears again - an endless loop. Clearing the credential is
   * enough: the route guards then redirect, which unmounts those queries.
   * Wiping the cache for real belongs to explicit sign-out and account
   * deletion, where the user is navigated away first (see useAuthMutations).
   */
  const clearSession = useCallback(() => {
    clearAuthToken();
    queryClient.setQueryData(queryKeys.session.current, null);
  }, [queryClient]);

  // One place handles 401 for the whole app (shared/api/authSession.ts).
  useEffect(() => {
    setUnauthorizedHandler(clearSession);
    return () => setUnauthorizedHandler(null);
  }, [clearSession]);

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.session.current });
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(() => {
    const user = sessionQuery.data ?? null;
    const status: AuthStatus = sessionQuery.isPending
      ? 'loading'
      : user
        ? 'authenticated'
        : 'unauthenticated';

    return {
      status,
      user,
      isAuthenticated: status === 'authenticated',
      hasCompletedAssessment: user?.hasCompletedAssessment ?? false,
      refresh,
      clearSession,
    };
  }, [sessionQuery.data, sessionQuery.isPending, refresh, clearSession]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
