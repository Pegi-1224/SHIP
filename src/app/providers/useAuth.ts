import { useContext } from 'react';
import { AuthContext, type AuthContextValue } from './authContext';

/** Read the current session. Throws if used outside `<AuthProvider>`. */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside <AuthProvider>. Check src/app/providers.');
  }
  return context;
}
