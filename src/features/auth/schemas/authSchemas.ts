/**
 * Sign-in form validation.
 *
 * Messages are written for the person reading them, not for a developer: they
 * say what to do next rather than naming the rule that failed.
 */
import { z } from 'zod';

export const emailSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Enter your email address.')
    .pipe(z.email('Enter a valid email address, for example you@example.com.')),
});

export type EmailFormValues = z.infer<typeof emailSchema>;

export const verificationCodeSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, 'Enter the 6-digit code.')
    .regex(/^\d{6}$/, 'The code is 6 digits.'),
});

export type VerificationCodeFormValues = z.infer<typeof verificationCodeSchema>;
