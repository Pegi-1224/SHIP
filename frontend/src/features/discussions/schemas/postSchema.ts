/** Post composer validation (spec 6.4). */
import { z } from 'zod';
import { MIN_TAGS_PER_POST } from '@/shared/config/constants';

export const POST_TITLE_MAX = 140;
export const POST_BODY_MAX = 5000;

export const postSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Add a title so people know what this is about.')
    .max(POST_TITLE_MAX, `Keep the title under ${POST_TITLE_MAX} characters.`),
  body: z
    .string()
    .trim()
    .min(1, 'Write something before posting.')
    .max(POST_BODY_MAX, `Posts can be up to ${POST_BODY_MAX} characters.`),
  tags: z
    .array(z.string())
    .min(MIN_TAGS_PER_POST, `Add at least ${MIN_TAGS_PER_POST} tag so people can find this.`),
});

export type PostFormValues = z.infer<typeof postSchema>;

export const commentSchema = z.object({
  body: z.string().trim().min(1, 'Write something before posting.').max(2000, 'That is too long.'),
});

export type CommentFormValues = z.infer<typeof commentSchema>;
