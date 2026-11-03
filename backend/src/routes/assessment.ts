/**
 * Onboarding assessment (spec 3.3, 6.6). Saving it is what releases the frontend's assessment
 * gate: `hasCompletedAssessment` on the session user turns true.
 */
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../db/client.js'
import type { Prisma } from '../generated/prisma/client.js'
import { currentUser, requireAuth } from '../lib/auth.js'
import { parseOrThrow } from '../lib/errors.js'
import { CAREER_STAGES, INDUSTRIES, MAX_PRIORITY_ANSWERS, PRIORITIES } from '../lib/constants.js'

const answersSchema = z.object({
  stage: z.enum(CAREER_STAGES, { error: 'Choose where you are right now.' }),
  industries: z.array(z.enum(INDUSTRIES)).min(1, 'Choose at least one industry.'),
  priorities: z
    .array(z.enum(PRIORITIES))
    .min(1, 'Choose at least one thing that matters to you.')
    .max(MAX_PRIORITY_ANSWERS, `Choose at most ${MAX_PRIORITY_ANSWERS}.`),
  topics: z.array(z.string().trim().min(1)).min(1, 'Choose at least one topic.'),
  followedCompanyIds: z.array(z.string()).default([]),
})

export type AssessmentAnswers = z.output<typeof answersSchema>

function toRecord(row: { answers: Prisma.JsonValue; completedAt: Date; updatedAt: Date | null }) {
  return {
    answers: row.answers,
    completedAt: row.completedAt.toISOString(),
    updatedAt: row.updatedAt?.toISOString() ?? null,
  }
}

export async function assessmentRoutes(app: FastifyInstance) {
  /** The saved answers, or 204 when the user has never completed it. */
  app.get('/me/assessment', { preHandler: requireAuth }, async (request, reply) => {
    const row = await prisma.assessment.findUnique({ where: { userId: currentUser(request).id } })
    if (!row) return reply.status(204).send()
    return toRecord(row)
  })

  /** Create or replace the answers (also used to retake it from Profile). */
  app.put('/me/assessment', { preHandler: requireAuth }, async (request) => {
    const answers = parseOrThrow(answersSchema, request.body, 'Please check your answers.')
    const userId = currentUser(request).id
    const now = new Date()

    const row = await prisma.assessment.upsert({
      where: { userId },
      create: { userId, answers, completedAt: now },
      update: { answers, updatedAt: now },
    })
    return toRecord(row)
  })
}
