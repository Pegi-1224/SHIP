import { useEffect, useRef, useState, type ComponentType } from 'react';
import { useNavigate } from 'react-router-dom';
import { paths } from '@/shared/config/paths';
import { CompanyDemo, CompareDemo, DiscussionDemo } from '../components/FeatureTourDemos';
import styles from './WelcomeTourPage.module.css';

interface Feature {
  title: string;
  description: string;
  Demo: ComponentType;
  /** Says under the illustration that it is made up. */
  note: string;
}

const FEATURES: Feature[] = [
  {
    title: 'Look up any company',
    description:
      'See salary, promotion, support, benefits and maternity leave data, and share your own data anonymously.',
    Demo: CompanyDemo,
    note: 'Sample company for illustration',
  },
  {
    title: 'Side By Side Comparisons',
    description:
      'Explore how two companies stack up in salary, women’s leadership, maternity leave, and workplace benefits. Make better-informed career decisions by discovering which company best aligns with your goals and values.',
    Demo: CompareDemo,
    note: 'Sample companies for illustration',
  },
  {
    title: 'Discuss with Others',
    description:
      'Join a community of women sharing their real workplace experiences. Discover honest perspectives on company culture, leadership, and workplace support to help you navigate your career with confidence.',
    Demo: DiscussionDemo,
    note: 'Sample discussion for illustration',
  },
];

/**
 * Feature tour (`/welcome`, UI design, Nov 2026).
 *
 * A new account lands here straight after sign-up (`RedirectIfAuthenticated`) and sees what SHIP
 * does in three steps, one feature each; Next on the last step opens the assessment.
 *
 * The account already exists by now and its session is live, so there is no sign-up page to go
 * back to: /login would only send the user here again. Back is therefore disabled on step 1.
 */
export function WelcomeTourPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const isFirstRender = useRef(true);

  // Move focus to the new title on every step change, so a screen reader reads the new feature.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    titleRef.current?.focus();
  }, [step]);

  const feature = FEATURES[step]!;
  const isLast = step === FEATURES.length - 1;
  const { Demo } = feature;

  const goNext = () => {
    if (isLast) navigate(paths.assessment());
    else setStep(step + 1);
  };

  return (
    <section className={styles.page} aria-labelledby="tour-title">
      <h1 className="ship-visually-hidden">What you can do on SHIP</h1>

      <div className={styles.box}>
        <figure className={styles.demo}>
          <div className={styles.demoContent}>
            <Demo />
          </div>
          <figcaption className={styles.note}>{feature.note}</figcaption>
        </figure>

        <div className={styles.copy}>
          <p className={styles.badge}>
            Feature {step + 1} of {FEATURES.length}
          </p>
          <h2 id="tour-title" ref={titleRef} tabIndex={-1} className={styles.title}>
            {feature.title}
          </h2>
          <p className={styles.description}>{feature.description}</p>

          <ol className={styles.dots} aria-hidden="true">
            {FEATURES.map((item, index) => (
              <li
                key={item.title}
                className={index === step ? `${styles.dot} ${styles.dotActive}` : styles.dot}
              />
            ))}
          </ol>

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.back}
              onClick={() => setStep(step - 1)}
              disabled={step === 0}
              aria-label="Back"
            >
              <span aria-hidden="true">‹</span>
            </button>
            <button type="button" className={styles.next} onClick={goNext}>
              Next
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
