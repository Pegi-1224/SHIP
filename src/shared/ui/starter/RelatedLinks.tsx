import { Group, Text } from '@mantine/core';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import styles from './RelatedLinks.module.css';

export interface RelatedLink {
  to: string;
  label: string;
}

export interface RelatedLinksProps {
  heading?: string;
  links: RelatedLink[];
}

/**
 * A short list of links to pages related to the current one, e.g. "back to
 * search" or "view this company's submission form". Used on starter pages so
 * a developer can still move between routes without a finished page design.
 *
 * This is real navigation, not a mock affordance: every link here resolves
 * with `src/shared/config/paths.ts` and goes to a real, registered route.
 */
export function RelatedLinks({ heading = 'Related pages', links }: RelatedLinksProps) {
  if (links.length === 0) return null;

  return (
    <nav aria-label={heading} className={styles.nav}>
      <Text size="xs" fw={700} c="dimmed" tt="uppercase" mb={4}>
        {heading}
      </Text>
      <Group gap="md" wrap="wrap" component="ul" className={styles.list}>
        {links.map((link) => (
          <li key={link.to}>
            <Link to={link.to} className={styles.link}>
              <ArrowRight size={14} aria-hidden="true" />
              {link.label}
            </Link>
          </li>
        ))}
      </Group>
    </nav>
  );
}
