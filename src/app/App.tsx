import { BrowserRouter } from 'react-router-dom';
import { AppProviders } from './providers/AppProviders';
import { AppRoutes } from './router/AppRoutes';

/**
 * The application root.
 *
 * Deliberately small: providers and the router. Pages, layouts and feature
 * logic live under `src/features` and `src/app/layouts`.
 *
 * Note: the finished-design instruction walkthrough
 * (`src/features/onboarding/components/InstructionWalkthrough.tsx`) is no
 * longer auto-mounted here. It is a polished, six-step tour built for the
 * finished page designs, which are being redone as starter pages - mounting
 * it automatically would pop a fully designed modal on top of placeholder
 * screens. The component itself is preserved and still exported from
 * `@/features/onboarding` for reuse once the real pages exist.
 */
export function App() {
  return (
    <BrowserRouter>
      <AppProviders>
        <AppRoutes />
      </AppProviders>
    </BrowserRouter>
  );
}
