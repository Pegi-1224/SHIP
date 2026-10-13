/** Discussion board domain model (spec 3.4, 6.4, 6.7). */
import type { AnonymousIdentity, IsoDateString } from './common';

/**
 * A tag as stored and compared: lower-case, no leading `#`, single spaces.
 * The `#` is presentation only and is added by `formatTag`.
 */
export type TagName = string;

export interface Tag {
  name: TagName;
  postCount: number;
}

export interface Post {
  id: string;
  title: string;
  body: string;
  tags: TagName[];
  author: AnonymousIdentity;
  /** True when the signed-in user wrote it, so edit/delete controls can show. */
  isOwn: boolean;
  createdAt: IsoDateString;
  /** Non-null once the post has been edited, which renders an "Edited" marker. */
  editedAt: IsoDateString | null;
  commentCount: number;
}

export interface Comment {
  id: string;
  postId: string;
  body: string;
  author: AnonymousIdentity;
  isOwn: boolean;
  createdAt: IsoDateString;
  editedAt: IsoDateString | null;
}

export interface PostListParams {
  /** Filter to a single tag. Omit for the whole feed. */
  tag?: TagName;
  /** Free-text search across title and body. */
  q?: string;
  page?: number;
  pageSize?: number;
}

export interface CreatePostInput {
  title: string;
  body: string;
  tags: TagName[];
}

export interface UpdatePostInput {
  title: string;
  body: string;
  tags: TagName[];
}

export interface CreateCommentInput {
  body: string;
}

/**
 * Grouped preview shown to signed-out visitors: at most
 * `PUBLIC_PREVIEW_POSTS_PER_TAG` posts per tag (spec 2.2, AC-3).
 */
export interface PublicTagPreview {
  tag: TagName;
  posts: Post[];
}

/**
 * The home recommendation feed (spec 3.8, 6.1, AC-1).
 *
 * `basedOnTags` is returned so the UI can tell the user *why* these posts were
 * chosen instead of presenting an opaque list. `unseenRemaining` lets the page
 * state honestly that nothing new is left, rather than promising fresh
 * recommendations it cannot deliver.
 */
export interface RecommendationFeed {
  items: Post[];
  /** Tags derived from assessment answers 3 and 4. */
  basedOnTags: TagName[];
  /** Posts carrying one of those tags, read or not. */
  totalMatching: number;
  /** Matching posts the user has not opened yet. */
  unseenRemaining: number;
}
