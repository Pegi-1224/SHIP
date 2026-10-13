/**
 * Internal shapes of the mock backend's database.
 *
 * These are NOT the API types. They are what a server would keep in its
 * tables - including fields the API must never return, such as a user's email
 * next to their posts. The handlers map these rows onto the public types in
 * `src/shared/types`, which is the same mapping a real backend performs.
 */
import type { AuthProvider } from '@/shared/types/user';
import type { AssessmentAnswers } from '@/shared/types/assessment';
import type { Company, CompanyPublicData, SubmissionSections } from '@/shared/types/company';
import type { IsoDateString } from '@/shared/types/common';

export interface MockUser {
  id: string;
  email: string;
  displayName: string;
  authProvider: AuthProvider;
  createdAt: IsoDateString;
  hasCompletedAssessment: boolean;
  hasSeenInstructions: boolean;
}

export interface MockAssessment {
  userId: string;
  answers: AssessmentAnswers;
  completedAt: IsoDateString;
  updatedAt: IsoDateString | null;
}

export interface MockSubmission {
  id: string;
  companyId: string;
  userId: string;
  sections: SubmissionSections;
  /** Start of the rolling 90-day window. Editing never moves it (spec 6.6). */
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
  /**
   * Set when a newer submission from the same user for the same company took
   * over. Superseded rows stay as history but are excluded from every
   * aggregate and from the eligible-contributor count.
   */
  supersededAt: IsoDateString | null;
}

export interface MockPost {
  id: string;
  authorId: string;
  title: string;
  body: string;
  tags: string[];
  createdAt: IsoDateString;
  editedAt: IsoDateString | null;
}

export interface MockComment {
  id: string;
  postId: string;
  authorId: string;
  body: string;
  createdAt: IsoDateString;
  editedAt: IsoDateString | null;
}

export interface MockConversation {
  id: string;
  /** Exactly two user ids. */
  participantIds: [string, string];
  createdAt: IsoDateString;
}

export interface MockMessage {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: IsoDateString;
  /** Idempotency key supplied by the sender; makes retries safe. */
  clientMessageId: string | null;
  /** Recipients who have opened the conversation since this arrived. */
  readBy: string[];
}

export interface MockEmailCode {
  email: string;
  code: string;
  expiresAt: IsoDateString;
  requestedAt: IsoDateString;
}

export interface MockDatabase {
  /** Bumped when the shape changes, which discards an incompatible saved copy. */
  version: number;
  users: MockUser[];
  /** token -> userId */
  sessions: Record<string, string>;
  emailCodes: MockEmailCode[];
  assessments: MockAssessment[];
  companies: Company[];
  /** companyId -> curated public data */
  publicData: Record<string, CompanyPublicData>;
  submissions: MockSubmission[];
  posts: MockPost[];
  comments: MockComment[];
  conversations: MockConversation[];
  messages: MockMessage[];
  /** userId -> post ids the user has opened. Drives "unseen" recommendations. */
  readPosts: Record<string, string[]>;
  /** Tags created by users that have no post yet. */
  customTags: string[];
}
