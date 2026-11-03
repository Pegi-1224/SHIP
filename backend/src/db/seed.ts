/**
 * Loads the fictional demo data into the database: `npm run db:seed`.
 *
 * It deletes and reloads ONLY the rows it owns - the seed companies, posts, comments, authors and
 * the `@seed.invalid` contributor accounts (with their submissions) - so it is safe to run again
 * to reset the demo, and it leaves real users and anything they created alone. Anyone's comments
 * or reports on a seeded post or company go with it.
 *
 * The JSON files in `seed-data/` are copies of frontend/src/mocks/data and of the formal
 * fixtures in frontend/src/mocks/fixtures. Every record is fictional.
 */
import { readFileSync } from 'node:fs'
import { Prisma } from '../generated/prisma/client.js'
import { prisma } from './client.js'
import { generateIdentity } from '../lib/identity.js'
import { hostnameOf } from '../lib/company.js'
import type { CompanyRecord, PostStatus } from '../types/demo.js'

const SEED_EMAIL_DOMAIN = 'seed.invalid'

interface UserSeed {
  refId: string
  displayName: string | null
  avatarUrl: string | null
  industry: string | null
  location: string | null
}

interface PostSeed {
  id: string
  authorRefId: string
  title: string
  content: string
  tags: string[]
  relatedCompanyIds: string[]
  createdAt: string
  updatedAt: string | null
  status: PostStatus
}

interface CommentSeed {
  id: string
  postId: string
  authorRefId: string
  content: string
  createdAt: string
  status: PostStatus
}

interface FormalCompanySeed {
  company: {
    id: string
    name: string
    website: string
    industry: string
    headquartersCity: string
    isDemoFixture: boolean
  }
  publicData: unknown
}

interface ContributorSeed {
  id: string
  displayName: string
  createdAt: string
}

interface SubmissionSeed {
  id: string
  companyId: string
  userId: string
  sections: unknown
  createdAt: string
  updatedAt: string
  supersededAt: string | null
}

function readSeed<T>(file: string): T {
  const path = new URL(`./seed-data/${file}`, import.meta.url)
  return JSON.parse(readFileSync(path, 'utf8')) as T
}

/** Prisma needs `DbNull` to store SQL NULL in an optional Json column. */
function nullableJson(value: unknown): Prisma.InputJsonValue | typeof Prisma.DbNull {
  return value === null || value === undefined ? Prisma.DbNull : (value as Prisma.InputJsonValue)
}

const json = (value: unknown) => value as Prisma.InputJsonValue

/** The demo records' industries, which the demo JSON does not carry. */
const DEMO_INDUSTRY: Record<string, string> = {
  'brightfern-health': 'Healthcare',
  'kestrel-cloudworks': 'Tech',
  'lumen-harbor-analytics': 'Tech',
  'orchid-ridge-bank': 'Finance',
  'quillstone-legal-tech': 'Tech',
  'wrenfield-studios': 'Entertainment',
}

const EMPTY_PUBLIC_DATA = { salary: null, promotion: null, diversity: null, benefits: null, maternity: null }

const demoCompanies = readSeed<CompanyRecord[]>('companies.json')
const formalCompanies = readSeed<FormalCompanySeed[]>('formal-companies.json')
const authors = readSeed<UserSeed[]>('users.json')
const posts = readSeed<PostSeed[]>('posts.json')
const comments = readSeed<CommentSeed[]>('comments.json')
const contributors = readSeed<ContributorSeed[]>('seed-users.json')
const submissions = readSeed<SubmissionSeed[]>('submissions.json')

const companyIds = [...demoCompanies.map((c) => c.id), ...formalCompanies.map((f) => f.company.id)]

await prisma.$transaction(async (tx) => {
  await tx.comment.deleteMany({ where: { id: { in: comments.map((c) => c.id) } } })
  await tx.post.deleteMany({ where: { id: { in: posts.map((p) => p.id) } } })
  await tx.author.deleteMany({ where: { refId: { in: authors.map((a) => a.refId) } } })
  await tx.company.deleteMany({ where: { id: { in: companyIds } } }) // cascades reports + submissions
  await tx.user.deleteMany({ where: { email: { endsWith: `@${SEED_EMAIL_DOMAIN}` } } })

  await tx.company.createMany({
    data: [
      ...demoCompanies.map((company) => ({
        id: company.id,
        name: company.name,
        website: company.website,
        websiteHost: hostnameOf(company.website),
        industry: DEMO_INDUSTRY[company.id] ?? 'Other',
        headquartersCity: company.location,
        isDemoFixture: true,
        publicData: EMPTY_PUBLIC_DATA,
        hasDemoProfile: true,
        intro: company.intro,
        mainFocus: company.mainFocus,
        location: company.location,
        email: company.email,
        phone: company.phone,
        address: company.address,
        contacts: json(company.contacts),
        sources: json(company.sources),
        dataCollectedAt: new Date(`${company.dataCollectedAt}T00:00:00Z`),
        verification: json(company.verification),
        salary: nullableJson(company.salary),
        promotion: nullableJson(company.promotion),
        womenSupport: nullableJson(company.womenSupport),
        benefits: company.benefits,
        paidMaternityLeave: nullableJson(company.paidMaternityLeave),
        userReported: json(company.userReported),
      })),
      ...formalCompanies.map(({ company, publicData }) => ({
        id: company.id,
        name: company.name,
        website: company.website,
        websiteHost: hostnameOf(company.website),
        industry: company.industry,
        headquartersCity: company.headquartersCity,
        isDemoFixture: company.isDemoFixture,
        publicData: json(publicData),
      })),
    ],
  })

  await tx.author.createMany({ data: authors })

  await tx.post.createMany({
    data: posts.map((post) => ({
      id: post.id,
      authorRefId: post.authorRefId,
      title: post.title,
      content: post.content,
      tags: post.tags,
      relatedCompanyIds: post.relatedCompanyIds,
      status: post.status,
      createdAt: new Date(post.createdAt),
      updatedAt: post.updatedAt ? new Date(post.updatedAt) : null,
    })),
  })

  await tx.comment.createMany({
    data: comments.map((comment) => ({ ...comment, createdAt: new Date(comment.createdAt) })),
  })

  // The contributors behind the seeded submissions. They cannot receive mail (`.invalid`).
  await tx.user.createMany({
    data: contributors.map((contributor) => {
      const identity = generateIdentity()
      return {
        id: contributor.id,
        email: `${contributor.displayName.toLowerCase()}@${SEED_EMAIL_DOMAIN}`,
        displayName: contributor.displayName,
        anonymousId: identity.id,
        anonymousLabel: identity.label,
        anonymousColor: identity.color,
        eligibilityConfirmedAt: new Date(contributor.createdAt),
        hasSeenInstructions: true,
        createdAt: new Date(contributor.createdAt),
      }
    }),
  })

  await tx.submission.createMany({
    data: submissions.map((submission) => ({
      id: submission.id,
      companyId: submission.companyId,
      userId: submission.userId,
      sections: json(submission.sections),
      createdAt: new Date(submission.createdAt),
      updatedAt: new Date(submission.updatedAt),
      supersededAt: submission.supersededAt ? new Date(submission.supersededAt) : null,
    })),
  })
})

console.log(
  `Seeded ${companyIds.length} companies (${demoCompanies.length} demo + ${formalCompanies.length} formal), ` +
    `${contributors.length} contributors, ${submissions.length} submissions, ` +
    `${authors.length} authors, ${posts.length} posts, ${comments.length} comments.`,
)
await prisma.$disconnect()
