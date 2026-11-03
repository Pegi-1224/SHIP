/**
 * Companies and company-data submissions (spec 3.5, 6.2-6.7, AC-5, AC-6, AC-7; api-contract.md
 * "Companies"). All of it needs a signed-in user (spec 2.2).
 *
 * Two behaviours are why this must be a server:
 *  1. The privacy threshold. `aggregateUserReported` drops every aggregate below five distinct
 *     contributors before serialisation, so the numbers never reach the browser.
 *  2. The 90-day submission window, which a client cannot be trusted to enforce.
 */
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../db/client.js'
import { Prisma } from '../generated/prisma/client.js'
import type { Company, Submission } from '../generated/prisma/client.js'
import { aggregateUserReported, onePerAccount } from '../lib/aggregation.js'
import { currentUser, requireAuth } from '../lib/auth.js'
import { hostnameOf, slugFor } from '../lib/company.js'
import { INDUSTRIES, SUBMISSION_WINDOW_DAYS } from '../lib/constants.js'
import { conflict, notFound, parseOrThrow, validationError } from '../lib/errors.js'
import { pageWindow, paginationQuerySchema, toPage } from '../lib/pagination.js'
import { nameSimilarity, normalizeCompanyName } from '../lib/search.js'
import { containsBannedWord } from '../lib/tags.js'
import { submissionSectionsSchema } from '../lib/submissionSchema.js'
import type { MetricAreaId, SubmissionSections } from '../lib/submissionSchema.js'

const WINDOW_MS = SUBMISSION_WINDOW_DAYS * 24 * 60 * 60 * 1000
const NO_SUCH_COMPANY = 'We do not have this company yet.'

const EMPTY_PUBLIC_DATA = {
  salary: null,
  promotion: null,
  diversity: null,
  benefits: null,
  maternity: null,
}

const searchQuerySchema = paginationQuerySchema.extend({
  q: z.string().default('').transform((value) => value.trim().toLowerCase()),
})
const suggestionQuerySchema = z.object({ name: z.string().default('').transform((v) => v.trim()) })
const compareQuerySchema = z.object({ a: z.string().default(''), b: z.string().default('') })
const companyParams = z.object({ companyId: z.string() })
const submissionParams = z.object({ companyId: z.string(), submissionId: z.string() })

const createCompanySchema = z.object({
  name: z
    .string({ error: 'Enter the company name.' })
    .trim()
    .min(2, 'Enter the company name.')
    .max(120, 'That name is too long.')
    .refine((name) => !containsBannedWord(name), 'This name contains a word we do not allow.'),
  website: z
    .string({ error: 'Enter a valid website, including https://' })
    .trim()
    .refine((value) => /^https?:\/\//i.test(value) && hostnameOf(value) !== null, {
      error: 'Enter a valid website, including https://',
    })
    .refine((value) => value.length <= 300, 'That website address is too long.'),
  industry: z.enum(INDUSTRIES, { error: 'Choose an industry.' }),
  headquartersCity: z
    .string({ error: 'Choose a city.' })
    .trim()
    .min(1, 'Choose a city.')
    .max(120, 'That city name is too long.'),
})

/** The `Company` type of the contract. */
function companyView(row: Company) {
  return {
    id: row.id,
    name: row.name,
    website: row.website,
    industry: row.industry,
    headquartersCity: row.headquartersCity,
    isDemoFixture: row.isDemoFixture,
  }
}

function submissionView(row: Submission) {
  return {
    id: row.id,
    companyId: row.companyId,
    sections: row.sections as SubmissionSections,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

function areasOf(sections: SubmissionSections): MetricAreaId[] {
  return (Object.keys(sections) as MetricAreaId[]).filter((area) => Boolean(sections[area]))
}

async function findCompanyOrThrow(companyId: string): Promise<Company> {
  const company = await prisma.company.findUnique({ where: { id: companyId } })
  if (!company) throw notFound(NO_SUCH_COMPANY)
  return company
}

async function buildProfile(company: Company) {
  const rows = await prisma.submission.findMany({
    where: { companyId: company.id, supersededAt: null },
  })
  const active = onePerAccount(
    rows.map((row) => ({ ...row, sections: row.sections as SubmissionSections })),
  )
  return {
    company: companyView(company),
    // Public and user-reported data are never merged or substituted for each other here.
    publicData: { ...EMPTY_PUBLIC_DATA, ...(company.publicData as Record<string, unknown>) },
    userReported: aggregateUserReported(active),
  }
}

function matchesQuery(company: Company, query: string): boolean {
  return (
    company.name.toLowerCase().includes(query) ||
    normalizeCompanyName(company.name).includes(normalizeCompanyName(query)) ||
    company.industry.toLowerCase() === query
  )
}

export async function companyRoutes(app: FastifyInstance) {
  /** Company search. */
  app.get('/companies', { preHandler: requireAuth }, async (request) => {
    const query = parseOrThrow(searchQuerySchema, request.query)
    const all = await prisma.company.findMany()
    const matches = query.q ? all.filter((company) => matchesQuery(company, query.q)) : all
    matches.sort((a, b) => a.name.localeCompare(b.name))

    const { skip, take } = pageWindow(query)
    return toPage(matches.slice(skip, skip + take).map(companyView), matches.length, query)
  })

  /** Near-duplicate suggestions while typing a new company name (spec 6.4). */
  app.get('/companies/name-suggestions', { preHandler: requireAuth }, async (request) => {
    const { name } = parseOrThrow(suggestionQuerySchema, request.query)
    if (name.length < 2) return []

    const all = await prisma.company.findMany()
    return all
      .map((company) => ({ company: companyView(company), similarity: nameSimilarity(name, company.name) }))
      .filter((entry) => entry.similarity >= 0.4)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5)
  })

  /** Both profiles in one request, so the two halves can never be from different moments. */
  app.get('/companies/compare', { preHandler: requireAuth }, async (request) => {
    const { a, b } = parseOrThrow(compareQuerySchema, request.query)
    const [companyA, companyB] = await Promise.all([
      prisma.company.findUnique({ where: { id: a } }),
      prisma.company.findUnique({ where: { id: b } }),
    ])
    if (!companyA || !companyB) throw notFound('One of those companies does not exist.')
    if (a === b) throw validationError('Choose two different companies to compare.')

    const [profileA, profileB] = await Promise.all([buildProfile(companyA), buildProfile(companyB)])
    return { a: profileA, b: profileB }
  })

  /** Add a company (spec 6.4). The website's hostname is the duplicate key. */
  app.post('/companies', { preHandler: requireAuth }, async (request, reply) => {
    const input = parseOrThrow(createCompanySchema, request.body)
    const host = hostnameOf(input.website)

    const duplicate = host ? await prisma.company.findUnique({ where: { websiteHost: host } }) : null
    if (duplicate) {
      throw validationError('Please fix the highlighted fields.', {
        website: [`${duplicate.name} already uses this website.`],
      })
    }

    const base = slugFor(input.name)
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      try {
        const company = await prisma.company.create({
          data: {
            id: attempt === 1 ? base : `${base}-${attempt}`,
            name: input.name,
            website: input.website,
            websiteHost: host,
            industry: input.industry,
            headquartersCity: input.headquartersCity,
            // A real record. A newly added company has no curated public data until the team adds it.
            isDemoFixture: false,
            publicData: EMPTY_PUBLIC_DATA,
          },
        })
        return reply.status(201).send(companyView(company))
      } catch (error) {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
          throw error
        }
        // Another request took this id, or the same website: tell the user if it was the website.
        const clash = host ? await prisma.company.findUnique({ where: { websiteHost: host } }) : null
        if (clash) {
          throw validationError('Please fix the highlighted fields.', {
            website: [`${clash.name} already uses this website.`],
          })
        }
      }
    }
    throw conflict('We could not save that company. Please try again.')
  })

  app.get('/companies/:companyId', { preHandler: requireAuth }, async (request) => {
    const { companyId } = parseOrThrow(companyParams, request.params)
    return buildProfile(await findCompanyOrThrow(companyId))
  })

  /** Whether the user may create a new submission, or must edit the one they have. */
  app.get('/companies/:companyId/my-submission', { preHandler: requireAuth }, async (request) => {
    const { companyId } = parseOrThrow(companyParams, request.params)
    await findCompanyOrThrow(companyId)

    const existing = await prisma.submission.findFirst({
      where: { companyId, userId: currentUser(request).id, supersededAt: null },
      orderBy: { createdAt: 'desc' },
    })
    if (!existing) {
      return { canCreateNew: true, existingSubmission: null, nextSubmissionAllowedAt: null }
    }

    // The window runs from the FIRST submission. Editing never restarts it.
    const windowEnds = existing.createdAt.getTime() + WINDOW_MS
    const canCreateNew = Date.now() >= windowEnds
    return {
      canCreateNew,
      existingSubmission: submissionView(existing),
      nextSubmissionAllowedAt: canCreateNew ? null : new Date(windowEnds).toISOString(),
    }
  })

  /** Create a submission (spec 6.5, AC-7). */
  app.post('/companies/:companyId/submissions', { preHandler: requireAuth }, async (request, reply) => {
    const { companyId } = parseOrThrow(companyParams, request.params)
    const sections = parseOrThrow(submissionSectionsSchema, request.body)
    const userId = currentUser(request).id

    const created = await prisma.$transaction(async (tx) => {
      // Lock the company so two simultaneous submissions cannot both pass the window check.
      const locked = await tx.$queryRaw<{ id: string }[]>(
        Prisma.sql`SELECT "id" FROM "Company" WHERE "id" = ${companyId} FOR UPDATE`,
      )
      if (locked.length === 0) throw notFound(NO_SUCH_COMPANY)

      const existing = await tx.submission.findFirst({
        where: { companyId, userId, supersededAt: null },
        orderBy: { createdAt: 'desc' },
      })
      if (existing) {
        if (Date.now() < existing.createdAt.getTime() + WINDOW_MS) {
          throw conflict(
            `You already shared data for this company in the last ${SUBMISSION_WINDOW_DAYS} days. You can edit that submission instead.`,
          )
        }
        // Past the window: the new submission replaces the old one in the aggregates, and the old
        // one is kept as history (spec 6.6).
        await tx.submission.update({ where: { id: existing.id }, data: { supersededAt: new Date() } })
      }
      return tx.submission.create({
        data: { companyId, userId, sections: sections as Prisma.InputJsonValue },
      })
    })
    return reply.status(201).send(submissionView(created))
  })

  /** Edit an existing submission. Does not restart the 90-day window; aggregates recompute at once. */
  app.put(
    '/companies/:companyId/submissions/:submissionId',
    { preHandler: requireAuth },
    async (request) => {
      const { companyId, submissionId } = parseOrThrow(submissionParams, request.params)
      const sections = parseOrThrow(submissionSectionsSchema, request.body)

      const existing = await prisma.submission.findUnique({ where: { id: submissionId } })
      // Ownership is checked here. Someone else's submission is "not found", so its existence is
      // not revealed.
      if (!existing || existing.companyId !== companyId || existing.userId !== currentUser(request).id) {
        throw notFound('That submission no longer exists.')
      }
      if (existing.supersededAt !== null) {
        throw conflict('That submission was replaced by a newer one, so it can no longer be edited.')
      }

      const updated = await prisma.submission.update({
        where: { id: submissionId },
        data: { sections: sections as Prisma.InputJsonValue, updatedAt: new Date() },
      })
      return submissionView(updated)
    },
  )

  /** The signed-in user's contribution history, for Profile. */
  app.get('/me/submissions', { preHandler: requireAuth }, async (request) => {
    const rows = await prisma.submission.findMany({
      where: { userId: currentUser(request).id },
      orderBy: { createdAt: 'desc' },
      include: { company: { select: { name: true } } },
    })
    return rows.map((row) => ({
      id: row.id,
      companyId: row.companyId,
      companyName: row.company.name,
      areas: areasOf(row.sections as SubmissionSections),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      isSuperseded: row.supersededAt !== null,
    }))
  })
}
