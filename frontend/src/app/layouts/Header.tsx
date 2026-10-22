import { Link, NavLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Avatar, Button, Menu } from '@mantine/core';
import { useDebouncedCallback } from '@mantine/hooks';
import { LogOut, MessageCircle, User } from 'lucide-react';
import { paths, routePatterns } from '@/shared/config/paths';
import { SearchInput } from '@/shared/ui';
import { useAuth } from '@/app/providers/useAuth';
import { useSignOut } from '@/features/auth';
import styles from './Header.module.css';

const NAV_LINKS = [
  { to: paths.home(), label: 'Home', end: true },
  { to: paths.discussions(), label: 'Discussion', end: false },
] as const;

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  isActive ? `${styles.navLink} ${styles.navLinkActive}` : styles.navLink;

/** Wait this long after the last keystroke before updating live results. */
const LIVE_SEARCH_DELAY_MS = 250;

interface HeaderSearchConfig {
  key: string;
  label: string;
  placeholder: string;
  /** Where a search goes. */
  toPath: (query: string) => string;
  /**
   * True when this page shows the results itself, so results follow the text
   * as it is typed (the URL is replaced, not pushed, to keep Back usable).
   */
  live: boolean;
}

const COMPANY_SEARCH = {
  key: 'company-q',
  label: 'Search companies',
  placeholder: 'Search companies',
} as const;

const DISCUSSION_SEARCH = {
  key: 'discussion-q',
  label: 'Search discussions',
  placeholder: 'Search discussions',
} as const;

/**
 * Which search bar the header shows on the current page: company search on
 * Home (live results on the page itself) and the company results page,
 * discussion search on Discussions, none elsewhere.
 */
function useHeaderSearch(): HeaderSearchConfig | null {
  const { pathname } = useLocation();
  if (pathname === routePatterns.home) {
    return { ...COMPANY_SEARCH, toPath: paths.homeSearch, live: true };
  }
  if (pathname === routePatterns.companies) {
    return { ...COMPANY_SEARCH, toPath: paths.companiesSearch, live: false };
  }
  if (pathname === routePatterns.discussions) {
    return { ...DISCUSSION_SEARCH, toPath: paths.discussionsSearch, live: true };
  }
  if (pathname.startsWith(routePatterns.discussions)) {
    return { ...DISCUSSION_SEARCH, toPath: paths.discussionsSearch, live: false };
  }
  return null;
}

/**
 * Top navigation bar (spec 3.11): brand on the left, a page-specific search bar
 * next to it, and Home / Discussion / Profile on the right.
 *
 * The search bar is shown to signed-out visitors too, because the Home search
 * runs on the public demo data (docs/demo-search.md). The other pages that
 * show a search bar sit behind sign-in anyway.
 */
export function Header() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, user } = useAuth();
  const signOut = useSignOut();
  const search = useHeaderSearch();

  // Not trimmed: the field re-syncs from the URL, so trimming here would eat
  // the space the user just typed between two words. Results trim instead.
  const goLive = useDebouncedCallback((query: string) => {
    if (search) navigate(search.toPath(query), { replace: true });
  }, LIVE_SEARCH_DELAY_MS);

  const isProfileArea =
    pathname.startsWith(routePatterns.profile) || pathname.startsWith(routePatterns.messages);

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link to={paths.home()} className={styles.brand} aria-label="SHIP home">
          <span className={styles.brandMark} aria-hidden="true">
            S
          </span>
          <span className={styles.brandName}>SHIP</span>
        </Link>

        {search ? (
          <div className={styles.search}>
            <SearchInput
              key={search.key}
              name={search.key}
              label={search.label}
              placeholder={search.placeholder}
              hideLabel
              defaultValue={search.live ? (searchParams.get('q') ?? '') : ''}
              classNames={{ input: styles.searchInput, section: styles.searchSection }}
              leftSectionWidth={46.8}
              onChange={search.live ? goLive : undefined}
              onSearch={(query) => navigate(search.toPath(query), { replace: search.live })}
            />
          </div>
        ) : null}

        <nav className={styles.nav} aria-label="Main">
          {NAV_LINKS.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end} className={navLinkClass}>
              {link.label}
            </NavLink>
          ))}

          {isAuthenticated && user ? (
            <Menu position="bottom-end" withinPortal>
              <Menu.Target>
                <button
                  type="button"
                  className={
                    isProfileArea
                      ? `${styles.navLink} ${styles.profile} ${styles.navLinkActive}`
                      : `${styles.navLink} ${styles.profile}`
                  }
                >
                  <Avatar size={28.8} radius="xl" color="ship" aria-hidden="true">
                    <User size={16} />
                  </Avatar>
                  Profile
                </button>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>{user.email}</Menu.Label>
                <Menu.Item
                  leftSection={<User size={14} />}
                  onClick={() => navigate(paths.profile())}
                >
                  My profile
                </Menu.Item>
                <Menu.Item
                  leftSection={<MessageCircle size={14} />}
                  onClick={() => navigate(paths.messages())}
                >
                  Messages
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item
                  leftSection={<LogOut size={14} />}
                  onClick={() => signOut.mutate()}
                  disabled={signOut.isPending}
                >
                  {signOut.isPending ? 'Signing out…' : 'Sign out'}
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          ) : (
            <Button size="sm" className={styles.signUp} onClick={() => navigate(paths.login())}>
              Sign up
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
