import { Link } from 'react-router-dom';
import { paths } from '@/shared/config/paths';
import styles from './WelcomeBanner.module.css';

/** Signed-out greeting at the top of Home, with the sign-up call to action. */
export function WelcomeBanner() {
  return (
    <section className={styles.banner} aria-labelledby="welcome-title">
      <div className={styles.text}>
        <h1 id="welcome-title" className={styles.title}>
          Find a workplace that has your back.
        </h1>
        <p className={styles.subtitle}>
          Sign up to search companies, compare them, and join the conversation.
        </p>
      </div>
      <Link to={paths.login()} className={styles.cta}>
        Sign up
      </Link>
    </section>
  );
}
