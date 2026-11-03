/**
 * Loads the fictional demo data into the database: `npm run db:seed`.
 *
 * It first deletes every demo company, report, author, post and comment, so running it
 * again resets the demo data to the JSON files in `seed-data/` (a copy of
 * frontend/src/mocks/data). Do not run it against a database with real content.
 */
import { readFileSync } from 'node:fs'
import { Prisma } from '../generated/prisma/client.js'
import { prisma } from './client.js'
import type { CompanyRecord, PostStatus } from '../types/demo.js'

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

function readSeed<T>(file: string): T {
  const path = new URL(`./seed-data/${file}`, import.meta.url)
  return JSON.parse(readFileSync(path, 'utf8')) as T
}

/** Prisma needs `DbNull` to store SQL NULL in an optional Json column. */
function nullableJson(value: unknown): Prisma.InputJsonValue | typeof Prisma.DbNull {
  return value === null || value === undefined ? Prisma.DbNull : (value as Prisma.InputJsonValue)
}

const companies = readSeed<CompanyRecord[]>('companies.json')
const users = readSeed<UserSeed[]>('users.json')
const posts = readSeed<PostSeed[]>('posts.json')
const comments = readSeed<CommentSeed[]>('comments.json')

await prisma.$transaction(async (tx) => {
  await tx.comment.deleteMany()
  await tx.post.deleteMany()
  await tx.author.deleteMany()
  await tx.companyReport.deleteMany()
  await tx.company.deleteMany()

  await tx.company.createMany({
    data: companies.map((company) => ({
      id: company.id,
      name: company.name,
      website: company.website,
      intro: company.intro,
      mainFocus: company.mainFocus,
      location: company.location,
      email: company.email,
      phone: company.phone,
      address: company.address,
      contacts: company.contacts as unknown as Prisma.InputJsonValue,
      sources: company.sources as unknown as Prisma.InputJsonValue,
      dataCollectedAt: new Date(`${company.dataCollectedAt}T00:00:00Z`),
      verification: company.verification as unknown as Prisma.InputJsonValue,
      salary: nullableJson(company.salary),
      promotion: nullableJson(company.promotion),
      womenSupport: nullableJson(company.womenSupport),
      benefits: company.benefits,
      paidMaternityLeave: nullableJson(company.paidMaternityLeave),
      userReported: company.userReported as unknown as Prisma.InputJsonValue,
    })),
  })

  await tx.author.createMany({ data: users })

  await tx.post.createMany({
    // `commentCount` in the JSON is ignored: the API counts the real comments.
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
})

console.log(
  `Seeded ${companies.length} companies, ${users.length} authors, ${posts.length} posts, ${comments.length} comments.`,
)
await prisma.$disconnect()
