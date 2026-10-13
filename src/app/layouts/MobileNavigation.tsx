import { NavLink } from 'react-router-dom';
import { Home, MessageCircle, User } from 'lucide-react';
import { paths } from '@/shared/config/paths';
import styles from './MobileNavigation.module.css';

const ITEMS = [
  { to: paths.home(), label: 'Home', icon: Home, end: true },
  { to: paths.messages(), label: 'Messages', icon: MessageCircle, end: false },
  { to: paths.profile(), label: 'Profile', icon: User, end: false },
] as const;

/**
 * Bottom navigation for small screens (spec 3.11: Home, DM, Profile).
 *
 * Rendered for signed-in users only. Messages and Profile require an account,
 * and a signed-out visitor tapping them would only meet a sign-in prompt.
 */
export function MobileNavigation() {
  return (
    <nav className={styles.nav} aria-label="Primary">
      <ul className={styles.list}>
        {ITEMS.map((item) => (
          <li key={item.to} className={styles.item}>
            <NavLink
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                isActive ? `${styles.link} ${styles.linkActive}` : styles.link
              }
            >
              <item.icon size={20} aria-hidden="true" />
              <span className={styles.label}>{item.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
