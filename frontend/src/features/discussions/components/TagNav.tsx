import { formatTag } from '@/shared/utils/format';
import styles from './DiscussionFeed.module.css';

export interface TagNavProps {
  tags: readonly string[];
  /** The tag the feed is filtered by, or `''` for none. */
  selected: string;
  /** Called with the clicked tag, or `''` when the selected tag is clicked again. */
  onSelect: (tag: string) => void;
}

/** "TAGS" sidebar on the Discussions page. One tag at a time filters the feed. */
export function TagNav({ tags, selected, onSelect }: TagNavProps) {
  return (
    <nav className={styles.tagNav} aria-labelledby="tag-nav-title">
      <h2 id="tag-nav-title" className={styles.tagNavTitle}>
        TAGS
      </h2>
      <ul className={styles.tagNavList}>
        {tags.map((tag) => {
          const isSelected = tag === selected;
          return (
            <li key={tag}>
              <button
                type="button"
                className={
                  isSelected ? `${styles.tagNavItem} ${styles.selected}` : styles.tagNavItem
                }
                aria-pressed={isSelected}
                onClick={() => onSelect(isSelected ? '' : tag)}
              >
                {formatTag(tag)}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
