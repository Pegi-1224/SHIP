import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Button, Menu } from '@mantine/core';
import { ChevronDown, LogOut, MessageCircle, User } from 'lucide-react';
import { paths, routePatterns } from '@/shared/config/paths';
import { SearchInput } from '@/shared/ui';
import { useAuth } from '@/app/providers/useAuth';
import { useSignOut } from '@/features/auth';
import styles from './Header.module.css';

const NAV_LINKS = [
  { to: paths.home(), label: 'Home', end: true },
  { to: paths.discussions(), label: 'Discussions', end: false },
] as const;

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  isActive ? `${styles.navLink} ${styles.navLinkActive}` : styles.navLink;

/**
 * Which search bar the header shows on the current page: company search on
 * Home (and its results page), discussion search on Discussions, none
 * elsewhere.
 */
function useHeaderSearch() {
  const { pathname } = useLocation();
  if (pathname === routePatterns.home || pathname === routePatterns.companies) {
    return 'companies';
  }
  if (pathname.startsWith(routePatterns.discussions)) {
    return 'discussions';
  }
  return null;
}

/**
 * Top navigation bar (spec 3.11): brand on the left, a page-specific search bar
 * in the middle, and Home / Discussions / Profile on the right.
 *
 * Search is hidden from signed-out visitors, who are not allowed to use it
 * (spec 2.2, AC-3) - hiding a control the user cannot use is clearer than
 * showing one that always fails.
 */
export function Header() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { isAuthenticated, user } = useAuth();
  const signOut = useSignOut();
  const search = useHeaderSearch();

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

        {isAuthenticated && search ? (
          <div className={styles.search}>
            {search === 'companies' ? (
              <SearchInput
                key="company-q"
                name="company-q"
                label="Search companies"
                placeholder="Search a company"
                hideLabel
                size="sm"
                onSearch={(query) => navigate(paths.companiesSearch(query))}
              />
            ) : (
              <SearchInput
                key="discussion-q"
                name="discussion-q"
                label="Search discussions"
                placeholder="Search a tag or post"
                hideLabel
                size="sm"
                onSearch={(query) => navigate(paths.discussionsSearch(query))}
              />
            )}
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
                    isProfileArea ? `${styles.navLink} ${styles.navLinkActive}` : styles.navLink
                  }
                >
                  Profile
                  <ChevronDown size={14} aria-hidden="true" />
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
            <Button size="sm" onClick={() => navigate(paths.login())}>
              Sign up
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
