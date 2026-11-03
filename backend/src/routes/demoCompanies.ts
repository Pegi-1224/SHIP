/**
 * Demo company endpoints, matching frontend/src/mocks/handlers/demoSearch.ts:
 *
 *   GET  /demo/companies?q=               ranked search; empty q returns every company
 *   GET  /demo/companies/:companyId       one company
 *   POST /demo/companies/:companyId/reports   add one anonymous user report
 *
 * These are public so the signed-out Home page can search. Spec 2.2 says signed-out
 * visitors may not search, so the production endpoints must require a session
 * (frontend/docs/demo-search.md).
 */
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../db/client.js'
import { Prisma } from '../generated/prisma/client.js'
import type { Company } from '../generated/prisma/client.js'
import { notFound, validationError } from '../lib/errors.js'
import { withPrivacyThreshold } from '../lib/privacy.js'
import { applyReport, validateReport } from '../lib/reports.js'
import { rank, scoreCompany } from '../lib/search.js'
import type { CompanyRecord, CompanyUserReported } from '../types/demo.js'

const NOT_FOUND_MESSAGE = 'We could not find that company.'

const searchQuery = z.object({ q: z.string().trim().default('') })
const idParams = z.object({ companyId: z.string() })

function toRecord(row: Company): CompanyRecord {
  return {
    id: row.id,
    name: row.name,
    website: row.website,
    intro: row.intro,
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

export async function demoCompanyRoutes(app: FastifyInstance) {
  app.get('/demo/companies', async (request) => {
    const { q } = searchQuery.parse(request.query)
    const rows = await prisma.company.findMany()
    const companies = rows
      .map(toRecord)
      .sort((a, b) => a.name.localeCompare(b.name))
    const result = rank(companies, q, scoreCompany)
    return {
      ...result,
      items: result.items.map((hit) => ({ ...hit, item: withPrivacyThreshold(hit.item) })),
    }
  })

  app.get('/demo/companies/:companyId', async (request) => {
    const { companyId } = idParams.parse(request.params)
    const row = await prisma.company.findUnique({ where: { id: companyId } })
    if (!row) throw notFound(NOT_FOUND_MESSAGE)
    return withPrivacyThreshold(toRecord(row))
  })

  app.post('/demo/companies/:companyId/reports', async (request, reply) => {
    const { companyId } = idParams.parse(request.params)

    const validation = validateReport(request.body)
    if (!validation.ok) {
      throw validationError('Please check the highlighted fields.', validation.fieldErrors)
    }
    const { report } = validation

    // Lock the company row so two simultaneous reports cannot overwrite each other's average.
    const updated = await prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<{ id: string }[]>(
        Prisma.sql`SELECT "id" FROM "Company" WHERE "id" = ${companyId} FOR UPDATE`,
      )
      if (locked.length === 0) return null

      const current = await tx.company.findUniqueOrThrow({ where: { id: companyId } })
      const userReported = applyReport(
        current.userReported as unknown as CompanyUserReported,
        report,
      )
      await tx.companyReport.create({
        data: { companyId, area: report.area, data: report as unknown as Prisma.InputJsonValue },
      })
      return tx.company.update({
        where: { id: companyId },
        data: { userReported: userReported as unknown as Prisma.InputJsonValue },
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
