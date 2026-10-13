/**
 * Public surface of the auth feature.
 *
 * Anything another feature, the app shell or a test needs must be listed here.
 * Reaching into `features/auth/...` directly is blocked by the ESLint
 * architecture rule.
 */
export { LoginPage } from './pages/LoginPage';

export {
  useSignOut,
  useDeleteAccount,
  useMarkInstructionsSeen,
} from './hooks/useAuthMutations';

// Used by AuthProvider to read the session, and by tests to sign in directly.
export { fetchSession, requestEmailCode, verifyEmailCode } from './api/authApi';
