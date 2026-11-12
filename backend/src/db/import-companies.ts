/**
 * Imports the reviewed real-company dataset: `npm run db:import-companies -- <file> [--dry-run] [--remove]`.
 *
 * <file> is normally `data/real-companies.json`, the JSON written by `export_for_backend.py` in the
 * company-research project. It carries only verified or reviewed values.
 *
 * Each company is upserted by id (a slug of its name) with `isDemoFixture: false`. The curated
 * figures go into `publicData` for the formal `/companies` endpoints and into the transitional
 * profile columns, with `hasDemoProfile: true`, so the `/demo/*` pages the frontend still calls
 * show them too. Re-running refreshes the curated columns and leaves user-reported aggregates,
 * reports and submissions alone. `--remove` deletes the imported companies again (which cascades
 * their reports and submissions), and `--dry-run` only validates and prints the plan.
 */
import { readFileSync } from 'node:fs'
import { z } from 'zod'
import { Prisma } from '../generated/prisma/client.js'
import { prisma } from './client.js'
import { hostnameOf, slugFor } from '../lib/company.js'

const INDUSTRIES = ['Tech', 'Finance', 'Consulting', 'Healthcare', 'Entertainment', 'Other'] as const

const source = z.object({ sourceName: z.string(), sourceUrl: z.string(), lastUpdated: z.string(), reportingPeriod: z.string() })
const publicData = z.object({
  salary: z.null(),
  promotion: z
    .object({
      womenPromotionRatePct: z.number().nullable(),
      promotionRateDefinition: z.string(),
      womenLeadershipPct: z.number().nullable(),
      leadershipDefinition: z.string(),
      source,
    })
    .nullable(),
  diversity: z.object({ womenWorkforcePct: z.number().nullable(), population: z.string(), source }).nullable(),
  benefits: z.object({ benefits: z.array(z.string()).nullable(), source }).nullable(),
  maternity: z
    .object({ paidWeeks: z.number().nullable(), payPercent: z.number().nullable(), policyScope: z.string(), source })
    .nullable(),
})
const profile = z.object({
  intro: z.string(),
  mainFocus: z.array(z.string()),
  location: z.string(),
  email: z.string(),
  phone: z.string(),
  address: z.string(),
  contacts: z.array(z.object({ name: z.string(), role: z.string(), email: z.string() })),
  sources: z.array(z.object({ label: z.string(), url: z.string() })),
  dataCollectedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  verification: z.object({
    status: z.enum(['verified', 'needs_review', 'unverified']),
    checkedBy: z.enum(['ai', 'human']),
    checkedAt: z.string().nullable(),
    confidence: z.number().nullable(),
    notes: z.string().nullable(),
  }),
  salary: z
    .object({
      averageAnnualUsd: z.number().nullable(),
      rangeUsd: z.object({ min: z.number(), max: z.number() }).nullable(),
      basis: z.string(),
      sourceUrl: z.string(),
    })
    .nullable(),
  promotion: z
    .object({ womenPromotionRatePct: z.number().nullable(), womenInManagementPct: z.number().nullable(), sourceUrl: z.string() })
    .nullable(),
  womenSupport: z.object({ womenWorkforcePct: z.number().nullable(), programs: z.array(z.string()) }).nullable(),
  benefits: z.array(z.string()),
  paidMaternityLeave: z
    .object({ paidWeeks: z.number().nullable(), payPercent: z.number().nullable(), notes: z.string().nullable() })
    .nullable(),
})
const exportFile = z.object({
  reviewDate: z.string(),
  companies: z.array(
    z.object({
      name: z.string().min(1),
      website: z.string().url(),
      industry: z.enum(INDUSTRIES),
      headquartersCity: z.string(),
      publicData,
      profile,
      sourceCompanyId: z.string(),
    }),
  ),
})

/** Prisma needs `DbNull` to store SQL NULL in an optional Json column. */
function nullableJson(value: unknown): Prisma.InputJsonValue | typeof Prisma.DbNull {
  return value === null || value === undefined ? Prisma.DbNull : (value as Prisma.InputJsonValue)
}
const json = (value: unknown) => value as Prisma.InputJsonValue

const args = process.argv.slice(2)
const file = args.find((a) => !a.startsWith('--'))
const dryRun = args.includes('--dry-run')
const remove = args.includes('--remove')
if (!file) {
  console.error('Usage: npm run db:import-companies -- <companies_backend.json> [--dry-run] [--remove]')
  process.exit(1)
}

const data = exportFile.parse(JSON.parse(readFileSync(file, 'utf8')))

// Stable ids from names, the same slug rule the API uses for companies users add.
const ids = new Set<string>()
const rows = data.companies.map((company) => {
  let id = slugFor(company.name)
  while (ids.has(id)) id = `${id}-${company.sourceCompanyId.toLowerCase()}`
  ids.add(id)
  return { id, host: hostnameOf(company.website), company }
})

if (remove) {
  // Only rows this importer owns: the listed ids that are not demo fixtures.
  const where = { id: { in: rows.map((r) => r.id) }, isDemoFixture: false }
  const count = await prisma.company.count({ where })
  if (!dryRun) await prisma.company.deleteMany({ where })
  console.log(`${dryRun ? 'Would remove' : 'Removed'} ${count} imported companies.`)
  await prisma.$disconnect()
  process.exit(0)
}

// A different row already holding the same website host would break the unique key; skip it.
const existing = await prisma.company.findMany({
  where: { websiteHost: { in: rows.flatMap((r) => (r.host ? [r.host] : [])) } },
  select: { id: true, websiteHost: true, isDemoFixture: true },
})
const hostOwner = new Map(existing.map((e) => [e.websiteHost, e]))
const skipped = rows.filter((r) => r.host && hostOwner.has(r.host) && hostOwner.get(r.host)!.id !== r.id)
const toImport = rows.filter((r) => !skipped.includes(r))
const already = new Set(
  (await prisma.company.findMany({ where: { id: { in: toImport.map((r) => r.id) } }, select: { id: true } })).map((c) => c.id),
)

console.log(`${data.companies.length} companies in ${file} (reviewed ${data.reviewDate})`)
console.log(`  create ${toImport.filter((r) => !already.has(r.id)).length}, update ${already.size}, skip ${skipped.length}`)
for (const r of skipped) console.log(`  skip ${r.company.name}: ${r.host} already belongs to "${hostOwner.get(r.host!)!.id}"`)

if (!dryRun) {
  await prisma.$transaction(
    toImport.map(({ id, host, company }) => {
      const p = company.profile
      const curated = {
        name: company.name,
        website: company.website,
        websiteHost: host,
        industry: company.industry,
        headquartersCity: company.headquartersCity,
        isDemoFixture: false,
        publicData: json(company.publicData),
        hasDemoProfile: true,
        intro: p.intro,
        mainFocus: p.mainFocus,
        location: p.location,
        email: p.email,
        phone: p.phone,
        address: p.address,
        contacts: json(p.contacts),
        sources: json(p.sources),
        dataCollectedAt: new Date(`${p.dataCollectedAt}T00:00:00Z`),
        verification: json(p.verification),
        salary: nullableJson(p.salary),
        promotion: nullableJson(p.promotion),
        womenSupport: nullableJson(p.womenSupport),
        benefits: p.benefits,
        paidMaternityLeave: nullableJson(p.paidMaternityLeave),
      }
      return prisma.company.upsert({ where: { id }, create: { id, ...curated }, update: curated })
    }),
  )
  console.log(`Imported ${toImport.length} companies.`)
}
await prisma.$disconnect()
