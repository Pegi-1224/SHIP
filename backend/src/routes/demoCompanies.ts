/**
 * Demo company endpoints, matching frontend/src/mocks/handlers/demoSearch.ts:
 *
 *   GET  /demo/companies?q=               ranked search; empty q returns every company
 *   GET  /demo/companies?q=&mode=names    name autocomplete for "Add this company"
 *   GET  /demo/companies/:companyId       one company
 *   POST /demo/companies                  add a company with the signed-in user's answers
 *   POST /demo/companies/:companyId/reports   add one anonymous user report
 *
 * The reads are public so the signed-out Home page can search. Spec 2.2 says signed-out
 * visitors may not search, so the production endpoints must require a session
 * (frontend/docs/demo-search.md).
 *
 * Validation and the aggregates come from src/shared (copied from the frontend by
 * `npm run sync:shared`), so the server checks exactly what the forms check.
 */
import { randomBytes } from 'node:crypto'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../db/client.js'
import { Prisma } from '../generated/prisma/client.js'
import type { Company } from '../generated/prisma/client.js'
import { currentUser, optionalUser, requireAuth } from '../lib/auth.js'
import { hostnameOf } from '../lib/company.js'
import { ApiError, notFound, validationError } from '../lib/errors.js'
import { withPrivacyThreshold } from '../lib/privacy.js'
import { rank, scoreCompany } from '../lib/search.js'
import type { Industry } from '../shared/types/common.js'
import type { StoredCompanySubmission } from '../shared/types/companySubmission.js'
import { applyReport, validateReport } from '../shared/utils/demoReports.js'
import {
  buildNewCompany,
  companyIdFor,
  findSameCompany,
  validateNewCompany,
} from '../shared/utils/newCompany.js'
import { suggestCompanyNames } from '../shared/utils/text.js'
import type { CompanyRecord, CompanyUserReported } from '../types/demo.js'

const NOT_FOUND_MESSAGE = 'We could not find that company.'
/** `CompanyReport.area` of a whole "Share your data" answer set from the add-company form. */
export const SHARE_DATA_AREA = 'share_data'
const MAX_NAME_SUGGESTIONS = 6

const searchQuery = z.object({
  q: z.string().trim().default(''),
  mode: z.enum(['search', 'names']).catch('search'),
})
const idParams = z.object({ companyId: z.string() })

const json = (value: unknown) => value as Prisma.InputJsonValue
const nullableJson = (value: unknown) =>
  value === null || value === undefined ? Prisma.DbNull : (value as Prisma.InputJsonValue)

function toRecord(row: Company): CompanyRecord {
  return {
    id: row.id,
    name: row.name,
    website: row.website,
    intro: row.intro,
    industry: row.industry as Industry,
    mainFocus: row.mainFocus,
    location: row.location,
    email: row.email,
    phone: row.phone,
    address: row.address,
    contacts: row.contacts as unknown as CompanyRecord['contacts'],
    sources: row.sources as unknown as CompanyRecord['sources'],
    dataCollectedAt: row.dataCollectedAt.toISOString().slice(0, 10),
    verification: row.verification as unknown as CompanyRecord['verification'],
    salary: row.salary as unknown as CompanyRecord['salary'],
    promotion: row.promotion as unknown as CompanyRecord['promotion'],
    womenSupport: row.womenSupport as unknown as CompanyRecord['womenSupport'],
    benefits: row.benefits,
    paidMaternityLeave: row.paidMaternityLeave as unknown as CompanyRecord['paidMaternityLeave'],
    userReported: row.userReported as unknown as CompanyUserReported,
  }
}

/** The same employer under another spelling of the name, or the same website. */
function duplicateError(name: string): ApiError {
  const message = `${name} is already listed on SHIP.`
  return new ApiError(409, 'conflict', message, { 'company.name': [message] })
}

export async function demoCompanyRoutes(app: FastifyInstance) {
  app.get('/demo/companies', async (request) => {
    const { q, mode } = searchQuery.parse(request.query)
    const rows = await prisma.company.findMany({ where: { hasDemoProfile: true } })
    const companies = rows.map(toRecord).sort((a, b) => a.name.localeCompare(b.name))

    if (mode === 'names') {
      const matches = suggestCompanyNames(q, companies, MAX_NAME_SUGGESTIONS)
      return {
        items: matches.map((item) => ({ item: withPrivacyThreshold(item), score: 1 })),
        total: matches.length,
      }
    }

    const result = rank(companies, q, scoreCompany)
    return {
      ...result,
      items: result.items.map((hit) => ({ ...hit, item: withPrivacyThreshold(hit.item) })),
    }
  })

  app.get('/demo/companies/:companyId', async (request) => {
    const { companyId } = idParams.parse(request.params)
    const row = await prisma.company.findFirst({ where: { id: companyId, hasDemoProfile: true } })
    if (!row) throw notFound(NOT_FOUND_MESSAGE)
    return withPrivacyThreshold(toRecord(row))
  })

  /**
   * "Add this company": the details from step 1 and the answers from step 2, in one request.
   * The answers are kept as a CompanyReport row under the user's anonymous handle (never the
   * account) and folded into the new company's `userReported`.
   */
  app.post('/demo/companies', { preHandler: requireAuth }, async (request, reply) => {
    const user = currentUser(request)
    const validation = validateNewCompany(request.body)
    if (!validation.ok) {
      throw validationError('Please check the highlighted fields.', validation.fieldErrors)
    }
    const input = validation.value

    const existing = await prisma.company.findMany({ select: { id: true, name: true } })
    const sameName = findSameCompany(input.company.name, existing)
    if (sameName) throw duplicateError(sameName.name)
    const websiteHost = input.company.website ? hostnameOf(input.company.website) : null
    if (websiteHost) {
      const sameSite = await prisma.company.findUnique({ where: { websiteHost } })
      if (sameSite) throw duplicateError(sameSite.name)
    }

    const submission: Omit<StoredCompanySubmission, 'answers'> = {
      id: `sub_${randomBytes(6).toString('hex')}`,
      authorRefId: user.anonymousId,
      submittedAt: new Date().toISOString(),
    }
    const id = companyIdFor(
      input.company.name,
      existing.map((company) => company.id),
    )
    const record = buildNewCompany(input, id, submission)

    try {
      const created = await prisma.$transaction(async (tx) => {
        const row = await tx.company.create({
          data: {
            id: record.id,
            name: record.name,
            website: record.website,
            websiteHost,
            industry: record.industry,
            headquartersCity: input.company.state,
            isDemoFixture: false,
            hasDemoProfile: true,
            intro: record.intro,
            mainFocus: record.mainFocus,
            location: record.location,
            email: record.email,
            phone: record.phone,
            address: record.address,
            contacts: json(record.contacts),
            sources: json(record.sources),
            dataCollectedAt: new Date(`${record.dataCollectedAt}T00:00:00Z`),
            verification: json(record.verification),
            salary: nullableJson(record.salary),
            promotion: nullableJson(record.promotion),
            womenSupport: nullableJson(record.womenSupport),
            benefits: record.benefits,
            paidMaternityLeave: nullableJson(record.paidMaternityLeave),
            userReported: json(record.userReported),
          },
        })
        await tx.companyReport.create({
          data: {
            companyId: row.id,
            area: SHARE_DATA_AREA,
            data: json({ ...submission, answers: input.data }),
            createdAt: new Date(submission.submittedAt),
          },
        })
        return row
      })
      return reply.status(201).send({
        company: withPrivacyThreshold(toRecord(created)),
        savedToFile: true,
      })
    } catch (error) {
      // Someone added the same id or website a moment earlier.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw duplicateError(input.company.name)
      }
      throw error
    }
  })

  app.post('/demo/companies/:companyId/reports', async (request, reply) => {
    const { companyId } = idParams.parse(request.params)

    const validation = validateReport(request.body)
    if (!validation.ok) {
      throw validationError('Please check the highlighted fields.', validation.fieldErrors)
    }
    const { report } = validation
    // A signed-in report carries the writer's anonymous handle (never the account), so Profile can
    // count it and account deletion can remove it. Signed-out reports stay unattributed.
    const viewer = await optionalUser(request)
    const authorRefId = viewer?.anonymousId ?? null

    // Lock the company row so two simultaneous reports cannot overwrite each other's average.
    const updated = await prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<{ id: string }[]>(
        Prisma.sql`SELECT "id" FROM "Company" WHERE "id" = ${companyId} AND "hasDemoProfile" = true FOR UPDATE`,
      )
      if (locked.length === 0) return null

      const current = await tx.company.findUniqueOrThrow({ where: { id: companyId } })
      const userReported = applyReport(
        current.userReported as unknown as CompanyUserReported,
        report,
      )
      await tx.companyReport.create({
        data: { companyId, area: report.area, data: json({ ...report, authorRefId }) },
      })
      return tx.company.update({
        where: { id: companyId },
        data: { userReported: json(userReported) },
      })
    })
    if (!updated) throw notFound(NOT_FOUND_MESSAGE)

    return reply.status(201).send({
      company: withPrivacyThreshold(toRecord(updated)),
      // The report is stored in the database, so it survives a reload.
      savedToFile: true,
    })
  })
}
