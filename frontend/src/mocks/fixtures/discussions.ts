/**
 * Seed discussion posts and comments.
 *
 * The content is invented sample copy written for this demo. It is not drawn
 * from real posts and does not describe real people or real employers.
 *
 * Tags cover the six assessment topics so home recommendations have something
 * to match, plus a few user-created tags so tag search is worth using.
 */
import type { MockComment, MockPost } from '../types';
import { SEED_USERS } from './users';

interface PostSeed {
  title: string;
  body: string;
  tags: string[];
  authorIndex: number;
  /** Hours before the fixed seed timestamp. Smaller is newer. */
  hoursAgo: number;
  edited?: boolean;
}

/** Fixed point so the seeded feed order is stable across reloads. */
const SEED_NOW = new Date('2026-10-10T12:00:00.000Z').getTime();

const POST_SEEDS: PostSeed[] = [
  {
    title: 'How did you find out you were underpaid?',
    body: 'I only realised after a teammate mentioned their band during a reorg. I am trying to work out whether to raise it with my manager or wait for the next review cycle. What worked for you, and did you bring written evidence?',
    tags: ['pay gap', 'negotiation'],
    authorIndex: 0,
    hoursAgo: 3,
  },
  {
    title: 'Manager asked me to "wait a cycle" for promotion again',
    body: 'Second time in a row. The feedback is always positive, there is never a concrete gap named. Has anyone successfully asked for written promotion criteria without it reading as confrontational?',
    tags: ['career goals', 'supportive manager'],
    authorIndex: 2,
    hoursAgo: 9,
  },
  {
    title: 'Returning from maternity leave at 16 weeks - what helped',
    body: 'Sharing what made the first month back manageable: a phased schedule for three weeks, a standing block for pumping that my manager defended, and one teammate who caught me up on decisions instead of sending me a document dump.',
    tags: ['maternity leave'],
    authorIndex: 1,
    hoursAgo: 20,
  },
  {
    title: 'Is it worth negotiating a signing bonus if base is capped?',
    body: 'Recruiter says base is fixed at the band maximum. I have a competing offer that is slightly lower on base but better on equity. Trying to figure out what is actually negotiable here.',
    tags: ['negotiation', 'pay gap'],
    authorIndex: 4,
    hoursAgo: 28,
  },
  {
    title: 'What does a genuinely supportive manager do differently?',
    body: 'I want to be able to describe this concretely in interviews instead of saying "good culture". So far my list is: names the promotion criteria, gives credit in writing, and does not schedule anything after 5pm without asking.',
    tags: ['supportive manager', 'career goals'],
    authorIndex: 3,
    hoursAgo: 36,
  },
  {
    title: 'Reported a comment to HR - what happened next',
    body: 'Writing this down because I could not find an account of the process when I needed one. Timeline, who was in the room, what was documented, and what I would do differently. Happy to answer questions.',
    tags: ['harassment support'],
    authorIndex: 5,
    hoursAgo: 48,
    edited: true,
  },
  {
    title: 'Switching from consulting to an in-house role',
    body: 'Three years in consulting, interviewing for in-house strategy roles. The pay bands look lower but the hours look survivable. Has anyone made this move and regretted it?',
    tags: ['career goals'],
    authorIndex: 6,
    hoursAgo: 60,
  },
  {
    title: 'Pay transparency laws - has your posting range been honest?',
    body: 'My last three applications posted ranges of 60k width. The offer landed at the bottom in all three. Curious whether anyone has had a posted range actually reflect the offer.',
    tags: ['pay gap'],
    authorIndex: 7,
    hoursAgo: 72,
  },
  {
    title: 'Lactation room exists but is always booked',
    body: 'Technically we have one. Practically it is a meeting room that anyone can reserve. I raised it with facilities and got a calendar link. What has actually worked at your company?',
    tags: ['maternity leave', 'return to work'],
    authorIndex: 8,
    hoursAgo: 90,
  },
  {
    title: 'Asked for the promotion criteria in writing - it worked',
    body: 'Follow-up to a thread I read here. I asked in a 1:1 and then summarised the answer in an email. Having it written down changed the next two conversations completely.',
    tags: ['career goals', 'negotiation'],
    authorIndex: 9,
    hoursAgo: 110,
  },
  {
    title: 'Counter-offer went badly - a warning',
    body: 'I used an external offer as leverage and got matched, then was quietly moved off the project I had been leading. Not saying never do it, but have a plan for the three months afterwards.',
    tags: ['negotiation'],
    authorIndex: 10,
    hoursAgo: 130,
  },
  {
    title: 'How do you evaluate parental leave beyond the headline weeks?',
    body: 'Sixteen weeks at 100% is not the same as sixteen weeks at 60%, and neither tells you whether people actually take it. What questions do you ask in interviews?',
    tags: ['maternity leave', 'benefits'],
    authorIndex: 11,
    hoursAgo: 150,
  },
  {
    title: 'First engineering manager role - what I wish I had asked',
    body: 'Specifically: how many direct reports on day one, whether the team was mid-reorg, and whether the previous manager left or was moved. All three turned out to matter more than the title.',
    tags: ['career goals', 'supportive manager'],
    authorIndex: 12,
    hoursAgo: 180,
  },
  {
    title: 'Does anyone else find "unlimited PTO" a red flag now?',
    body: 'Two companies in a row where unlimited meant nobody took more than ten days. Starting to prefer a fixed allowance I can actually point at.',
    tags: ['benefits', 'work life balance'],
    authorIndex: 13,
    hoursAgo: 210,
  },
  {
    title: 'Support after a harassment report - what is reasonable to ask for?',
    body: 'Thinking about team reassignment, a written outcome, and not having to be in recurring meetings with the person. Not sure which of these are normal to request.',
    tags: ['harassment support', 'supportive manager'],
    authorIndex: 1,
    hoursAgo: 240,
  },
  {
    title: 'Negotiating remote work after an in-office mandate',
    body: 'Two days in office became four with six weeks notice. I negotiated back to three with a written exception. Writing down the arguments that landed in case they help someone.',
    tags: ['negotiation', 'work life balance'],
    authorIndex: 4,
    hoursAgo: 280,
  },
];

interface CommentSeed {
  postIndex: number;
  authorIndex: number;
  body: string;
  hoursAgo: number;
}

const COMMENT_SEEDS: CommentSeed[] = [
  {
    postIndex: 0,
    authorIndex: 3,
    body: 'I brought the published range for my level plus two comparable postings. Keeping it about the band rather than about a specific colleague made it a much easier conversation.',
    hoursAgo: 2,
  },
  {
    postIndex: 0,
    authorIndex: 7,
    body: 'Waiting for the review cycle cost me about nine months. If your company does off-cycle adjustments at all, ask what triggers one.',
    hoursAgo: 1,
  },
  {
    postIndex: 1,
    authorIndex: 5,
    body: 'Asking for the criteria in writing is the part that changed it for me. Verbal feedback kept moving.',
    hoursAgo: 7,
  },
  {
    postIndex: 2,
    authorIndex: 9,
    body: 'The phased return was the single biggest thing for me too. Three weeks at 60% then full time.',
    hoursAgo: 15,
  },
  {
    postIndex: 5,
    authorIndex: 2,
    body: 'Thank you for writing this down. The part about documenting who was in the room is something I would not have thought of.',
    hoursAgo: 40,
  },
  {
    postIndex: 7,
    authorIndex: 11,
    body: 'One out of about ten for me. The honest one was a smaller company that posted a 15k range.',
    hoursAgo: 66,
  },
  {
    postIndex: 9,
    authorIndex: 0,
    body: 'Summarising it in an email afterwards is the trick. It turns a conversation into a record without making it adversarial.',
    hoursAgo: 100,
  },
];

function timestamp(hoursAgo: number): string {
  return new Date(SEED_NOW - hoursAgo * 3_600_000).toISOString();
}

function authorId(index: number): string {
  const user = SEED_USERS[index % SEED_USERS.length];
  if (!user) throw new Error(`No seed user at index ${index}`);
  return user.id;
}

export function buildSeedPosts(): MockPost[] {
  return POST_SEEDS.map((seed, index) => ({
    id: `post_seed_${index + 1}`,
    authorId: authorId(seed.authorIndex),
    title: seed.title,
    body: seed.body,
    tags: seed.tags,
    createdAt: timestamp(seed.hoursAgo),
    editedAt: seed.edited ? timestamp(seed.hoursAgo - 1) : null,
  }));
}

export function buildSeedComments(): MockComment[] {
  return COMMENT_SEEDS.map((seed, index) => ({
    id: `comment_seed_${index + 1}`,
    postId: `post_seed_${seed.postIndex + 1}`,
    authorId: authorId(seed.authorIndex),
    body: seed.body,
    createdAt: timestamp(seed.hoursAgo),
    editedAt: null,
  }));
}
