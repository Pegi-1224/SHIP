import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useAuth } from '@/app/providers/useAuth';
import { useSignOut } from '@/features/auth';
import { useMyAssessment } from '@/features/onboarding';
import { paths } from '@/shared/config/paths';
import { DeleteAccountDialog } from '../components/DeleteAccountDialog';
import { MyActivityList } from '../components/MyActivityList';
import { useProfileActivity } from '../hooks/useProfile';
import { maskEmail } from '../utils/maskEmail';
import styles from './ProfilePage.module.css';

/** A count, or a dash while it loads or when it could not be loaded. */
function statValue(value: number | undefined): string {
  return value === undefined ? '–' : String(value);
}

/**
 * Profile (`/profile`, spec 3.6, 3.9; UI design, Nov 2026).
 *
 * Everything here is visible to the signed-in user only: their name and email never appear next
 * to a post or comment. The page shows their real activity counts, their account, their own
 * posts and comments, and the two account actions (log out, delete).
 *
 * Sign-in is by email code, so there is no password to change: the account box says so instead
 * of offering a "Change password" action that could not work.
 */
export function ProfilePage() {
  const { user } = useAuth();
  const signOut = useSignOut();
  const activity = useProfileActivity();
  const assessment = useMyAssessment();
  const [activityOpen, setActivityOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (!user) return null;

  const name = user.displayName || user.email.split('@')[0] || 'You';
  const counts = activity.data;
  const topicCount = assessment.isSuccess
    ? (assessment.data?.answers.topics.length ?? 0)
    : undefined;

  return (
    <section className={styles.page} aria-labelledby="profile-name">
      <div className={styles.banner}>
        <div className={styles.avatar} aria-hidden="true">
          {name.slice(0, 1).toUpperCase()}
        </div>
        <div className={styles.identity}>
          <h1 id="profile-name" className={styles.name}>
            {name}
          </h1>
          <p className={styles.privateNote}>Only visible to you</p>
        </div>
        <Link to={paths.assessment()} className={styles.retake}>
          Retake assessment
        </Link>
      </div>

      <ul className={styles.stats} aria-label="Your activity">
        <li className={styles.stat}>
          <span className={styles.statValue} style={{ color: '#5b2acf' }}>
            {statValue(counts && counts.postCount + counts.commentCount)}
          </span>
          <span className={styles.statLabel}>Posts &amp; comments</span>
        </li>
        <li className={styles.stat}>
          <span className={styles.statValue} style={{ color: '#2f6fed' }}>
            {statValue(counts?.submissionCount)}
          </span>
          <span className={styles.statLabel}>Companies shared</span>
        </li>
        <li className={styles.stat}>
          <span className={styles.statValue} style={{ color: '#197967' }}>
            {statValue(topicCount)}
          </span>
          <span className={styles.statLabel}>Topics you follow</span>
        </li>
      </ul>

      <h2 className={styles.sectionLabel}>Account</h2>
      <div className={styles.panel}>
        <div className={styles.row}>
          <span className={styles.rowLabel}>Email</span>
          <span className={styles.rowValue}>{maskEmail(user.email)}</span>
        </div>
        <div className={styles.row}>
          <span className={styles.rowLabel}>Password</span>
          <span className={styles.rowValue}>Not needed: you sign in with an email code</span>
        </div>
      </div>

      <h2 className={styles.sectionLabel}>My activity</h2>
      <div className={styles.panel}>
        <button
          type="button"
          className={styles.rowButton}
          aria-expanded={activityOpen}
          aria-controls="my-activity"
          onClick={() => setActivityOpen((open) => !open)}
        >
          <span className={styles.rowLabel}>My posts &amp; comments</span>
          {activityOpen ? (
            <ChevronDown size={18} aria-hidden="true" />
          ) : (
            <ChevronRight size={18} aria-hidden="true" />
          )}
        </button>
        {activityOpen ? (
          <div id="my-activity" className={styles.activity}>
            <MyActivityList />
          </div>
        ) : null}
      </div>

      <div className={`${styles.panel} ${styles.lastPanel}`}>
        <button
          type="button"
          className={styles.rowButton}
          onClick={() => signOut.mutate()}
          disabled={signOut.isPending}
        >
          <span className={styles.rowLabel}>{signOut.isPending ? 'Logging out…' : 'Log out'}</span>
          <ChevronRight size={18} aria-hidden="true" />
        </button>
        <button type="button" className={styles.rowButton} onClick={() => setDeleteOpen(true)}>
          <span className={`${styles.rowLabel} ${styles.danger}`}>Delete account</span>
          <ChevronRight size={18} aria-hidden="true" />
        </button>
      </div>

      <DeleteAccountDialog opened={deleteOpen} onClose={() => setDeleteOpen(false)} />
    </section>
  );
}
