import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Skeleton } from '@mantine/core';
import { RefreshCw } from 'lucide-react';
import { DiscussionListCard } from '@/features/discussions';
import { useMyAssessment } from '@/features/onboarding';
import { getErrorMessage } from '@/shared/api';
import { paths } from '@/shared/config/paths';
import { formatCount, formatTag } from '@/shared/utils/format';
import { useForYouFeed, useTrendingTags } from '../hooks/useHome';
import { greetingFor } from '../utils/greeting';
import { CompanySpotlight } from './CompanySpotlight';
import styles from './ForYouHome.module.css';

/**
 * Home for a signed-in user (`/`): a greeting and posts on their assessment
 * topics on the left, then a suggested company, their topics and the trending
 * tags on the right.
 *
 * Refresh shows the next few posts, wrapping back to the newest at the end.
 * Data: `GET /demo/for-you`, `/demo/companies`, `/demo/tags/trending` and the
 * user's saved assessment.
 */
export function ForYouHome({ name }: { name: string }) {
  const navigate = useNavigate();
  const [offset, setOffset] = useState(0);
  const feed = useForYouFeed(offset);
  const assessment = useMyAssessment();
  const answers = assessment.data?.answers;

  function refresh() {
    const page = feed.data;
    if (!page || page.total <= page.items.length) {
      void feed.refetch();
      return;
    }
    setOffset(page.offset + page.items.length);
  }

  return (
    <div className={styles.layout}>
      <section aria-labelledby="home-greeting">
        <p className={styles.eyebrow}>FOR YOU</p>
        <div className={styles.greetingRow}>
          <h1 id="home-greeting" className={styles.greeting}>
            {greetingFor(new Date())}, {name}
          </h1>
          <button
            type="button"
            className={styles.refresh}
            onClick={refresh}
            disabled={feed.isFetching}
          >
            <RefreshCw size={16} aria-hidden="true" />
            Refresh
          </button>
        </div>

        <div className={styles.feed} aria-busy={feed.isFetching}>
          {feed.isPending
            ? Array.from({ length: 3 }, (_, index) => (
                <Skeleton key={index} height={198} radius={18} />
              ))
            : null}
          {feed.isError ? (
            <p className={styles.notice} role="alert">
              {getErrorMessage(feed.error)}
            </p>
          ) : null}
          {feed.data?.items.length === 0 ? (
            <p className={styles.notice}>No discussions yet. Be the first to start one.</p>
          ) : null}
          {feed.data?.items.map((post) => (
            <DiscussionListCard
              key={post.id}
              post={post}
              onTagClick={(tag) => navigate(paths.discussionsWithTag(tag))}
            />
          ))}
        </div>
      </section>

      <aside className={styles.aside} aria-label="Suggestions">
        <CompanySpotlight
          industries={answers?.industries ?? []}
          followedCompanyIds={answers?.followedCompanyIds ?? []}
        />

        <section className={styles.panel} aria-labelledby="home-topics-title">
          <h2 id="home-topics-title" className={styles.panelTitle}>
            Your topics
          </h2>
          {assessment.isPending ? <Skeleton height={28.8} radius={18} mt={14.4} /> : null}
          {answers ? (
            <ul className={styles.topics}>
              {answers.topics.map((tag) => (
                <li key={tag}>
                  <Link to={paths.discussionsWithTag(tag)} className={styles.topic}>
                    {formatTag(tag)}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
          {assessment.isSuccess ? (
            <p className={styles.panelNote}>
              {answers
                ? 'Based on your assessment answers.'
                : 'Take the assessment to pick the topics you want to follow.'}
            </p>
          ) : null}
          <Link to={paths.assessment()} className={styles.panelLink}>
            {answers || !assessment.isSuccess ? 'Retake assessment' : 'Take assessment'}
          </Link>
        </section>

        <TrendingTags />
      </aside>
    </div>
  );
}

/** The three tags on the most posts, each linking to the feed for that tag. */
function TrendingTags() {
  const trending = useTrendingTags();

  return (
    <section className={styles.panel} aria-labelledby="home-trending-title">
      <h2 id="home-trending-title" className={styles.panelTitle}>
        Trending
      </h2>
      {trending.isPending ? <Skeleton height={72} radius={8} mt={14.4} /> : null}
      {trending.isError ? (
        <p className={styles.panelNote}>{getErrorMessage(trending.error)}</p>
      ) : null}
      {trending.data ? (
        <ol className={styles.trending}>
          {trending.data.items.map(({ tag, postCount }) => (
            <li key={tag}>
              <Link to={paths.discussionsWithTag(tag)} className={styles.trendingRow}>
                <span className={styles.trendingTag}>{formatTag(tag)}</span>
                <span className={styles.trendingCount}>{formatCount(postCount, 'post')}</span>
              </Link>
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}
