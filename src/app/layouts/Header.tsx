import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Burger, Button, Drawer, Menu, Stack, Text } from '@mantine/core';
import { Building2, LogOut, MessageCircle, MessagesSquare, Scale, User } from 'lucide-react';
import { paths } from '@/shared/config/paths';
import { SearchInput } from '@/shared/ui';
import { useAuth } from '@/app/providers/useAuth';
import { useSignOut } from '@/features/auth';
import styles from './Header.module.css';

const NAV_LINKS = [
  { to: paths.discussions(), label: 'Discussions', icon: MessagesSquare },
  { to: paths.companies(), label: 'Companies', icon: Building2 },
  { to: paths.compare(), label: 'Compare', icon: Scale },
] as const;

/**
 * Top navigation (spec 3.11).
 *
 * The two search entry points are deliberately separate controls with their own
 * labels: one searches companies, the other searches discussion tags and posts.
 * Both are hidden from signed-out visitors, who are not allowed to use them
 * (spec 2.2, AC-3) - hiding a control the user cannot use is clearer than
 * showing one that always fails.
 */
export function Header() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const signOut = useSignOut();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const closeDrawer = () => setDrawerOpen(false);

  const searchBars = (
    <>
      <SearchInput
        name="company-q"
        label="Search companies"
        placeholder="Search a company"
        hideLabel
        size="sm"
        onSearch={(query) => {
          closeDrawer();
          navigate(paths.companiesSearch(query));
        }}
      />
      <SearchInput
        name="discussion-q"
        label="Search discussions"
        placeholder="Search a tag or post"
        hideLabel
        size="sm"
        onSearch={(query) => {
          closeDrawer();
          navigate(paths.discussionsSearch(query));
        }}
      />
    </>
  );

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link to={paths.home()} className={styles.brand} aria-label="SHIP home">
          <span className={styles.brandMark} aria-hidden="true">
            S
          </span>
          <span className={styles.brandName}>SHIP</span>
        </Link>

        {isAuthenticated ? <div className={styles.search}>{searchBars}</div> : null}

        <nav className={styles.nav} aria-label="Main">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                isActive ? `${styles.navLink} ${styles.navLinkActive}` : styles.navLink
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className={styles.actions}>
          {isAuthenticated && user ? (
            <Menu position="bottom-end" withinPortal>
              <Menu.Target>
                <Button variant="subtle" size="sm" leftSection={<User size={16} />}>
                  <span className={styles.accountLabel}>{user.displayName}</span>
                </Button>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>{user.email}</Menu.Label>
                <Menu.Item
                  leftSection={<User size={14} />}
                  onClick={() => navigate(paths.profile())}
                >
                  Profile
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

          <Burger
            opened={drawerOpen}
            onClick={() => setDrawerOpen((open) => !open)}
            className={styles.burger}
            aria-label="Open menu"
            size="sm"
          />
        </div>
      </div>

      <Drawer
        opened={drawerOpen}
        onClose={closeDrawer}
        title="Menu"
        position="right"
        size="xs"
      >
        <Stack gap="md">
          {isAuthenticated ? (
            <Stack gap="sm">{searchBars}</Stack>
          ) : (
            <Text size="sm" c="dimmed">
              Sign in to search companies and discussions.
            </Text>
          )}

          <Stack gap={4}>
            {NAV_LINKS.map((link) => (
              <Button
                key={link.to}
                variant="subtle"
                justify="flex-start"
                leftSection={<link.icon size={16} />}
                onClick={() => {
                  closeDrawer();
                  navigate(link.to);
                }}
              >
                {link.label}
              </Button>
            ))}
          </Stack>
        </Stack>
      </Drawer>
    </header>
  );
}
