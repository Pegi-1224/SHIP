import type { MouseEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import styles from './BackLink.module.css';

export interface BackLinkProps {
  /** Where to go when there is no earlier page in this tab, e.g. a shared link opened fresh. */
  fallback: string;
  label?: string;
}

/**
 * "‹ Back" to whatever page the user came from.
 *
 * Nothing is stored for this: the browser's own history already knows the
 * previous page, so it behaves exactly like the browser's Back button. React
 * Router marks the first page of a visit with `location.key === 'default'`;
 * there is nothing to go back to then, so the link goes to `fallback` instead
 * of leaving the site.
 */
export function BackLink({ fallback, label = 'Back' }: BackLinkProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const hasHistory = location.key !== 'default';

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    // Let modified clicks (new tab, new window) use the real href.
    if (!hasHistory || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) {
      return;
    }
    event.preventDefault();
    navigate(-1);
  }

  return (
    <Link to={fallback} onClick={handleClick} className={styles.back}>
      <span aria-hidden="true">‹</span>
      {label}
    </Link>
  );
}
