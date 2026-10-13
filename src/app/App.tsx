import { useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AppProviders } from './providers/AppProviders';
import { AppRoutes } from './router/AppRoutes';
import { useAuth } from './providers/useAuth';
import { InstructionWalkthrough } from '@/features/onboarding';

/**
 * The application root.
 *
 * Deliberately small: providers, the router, and the one piece of chrome that
 * is genuinely global. Pages, layouts and feature logic live under
 * `src/features` and `src/app/layouts`.
 */
export function App() {
  return (
    <BrowserRouter>
      <AppProviders>
        <AppRoutes />
        <OnboardingWalkthrough />
      </AppProviders>
    </BrowserRouter>
  );
}

/**
 * Opens the instruction walkthrough once, after the first assessment (spec 3.10).
 *
 * It lives here rather than on the home page because the user may land
 * anywhere after finishing onboarding, and the tour should follow them.
 */
function OnboardingWalkthrough() {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [dismissedForUserId, setDismissedForUserId] = useState<string | null>(null);

  const shouldShow = Boolean(user?.hasCompletedAssessment && !user.hasSeenInstructions);

  // A different user signing in should see their own walkthrough.
  if (user && dismissedForUserId !== user.id) {
    setDismissedForUserId(user.id);
    setDismissed(false);
  }

  if (!shouldShow || dismissed) return null;

  return <InstructionWalkthrough opened onClose={() => setDismissed(true)} />;
}
