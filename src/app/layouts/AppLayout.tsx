import { Outlet, useLocation } from 'react-router-dom';
import { Text } from '@mantine/core';
import { DemoDataBanner } from '@/shared/ui';
import { useAuth } from '@/app/providers/useAuth';
import { Header } from './Header';
import { MobileNavigation } from './MobileNavigation';
import styles from './AppLayout.module.css';

/** Routes that benefit from the full page width (side-by-side comparison). */
const WIDE_ROUTES = ['/compare'];

/**
 * The frame every page renders inside: skip link, demo banner, header, main
 * content and - on small screens, for signed-in users - the bottom navigation.
 *
 * Pages render into `<Outlet />`. They supply their own `PageHeader`; the
 * layout owns only the chrome around them.
 */
export function AppLayout() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const isWide = WIDE_ROUTES.some((route) => location.pathname.startsWith(route));

  const mainClassName = [
    styles.main,
    isWide ? styles.wide : '',
    isAuthenticated ? styles.mainWithBottomNav : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={styles.shell}>
      <a href="#main-content" className="ship-skip-link">
        Skip to main content
      </a>

      <DemoDataBanner />
      <Header />

      <main id="main-content" className={mainClassName} tabIndex={-1}>
        <Outlet />
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <Text size="xs" c="dimmed">
            SHIP helps women research workplace conditions and compare employers. This build runs on
            fictional demonstration data and is not connected to a production backend.
          </Text>
        </div>
      </footer>

      {isAuthenticated ? <MobileNavigation /> : null}
    </div>
  );
}
