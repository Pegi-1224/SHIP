import { createContext } from 'react';
import type { SessionUser } from '@/shared/types/user';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface AuthContextValue {
  status: AuthStatus;
  user: SessionUser | null;
  isAuthenticated: boolean;
  /** True once the user finished the assessment, which the router gates on. */
  hasCompletedAssessment: boolean;
  /** Re-reads the session, e.g. after completing the assessment. */
  refresh: () => Promise<void>;
  /** Drops the local session and clears every cached query. */
  clearSession: () => void;
}

/**
 * Holds the current session.
 *
 * Kept in its own file so `AuthProvider.tsx` exports only a component, which is
 * what React Fast Refresh needs to hot-reload it reliably.
 */
export const AuthContext = createContext<AuthContextValue | null>(null);
