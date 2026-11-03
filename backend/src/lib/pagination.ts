import { z } from 'zod'

export const DEFAULT_PAGE_SIZE = 20
export const MAX_PAGE_SIZE = 100

/** Query-string fields shared by every list endpoint. */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
})

export interface Page<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
  hasMore: boolean
}

/** Prisma `skip` / `take` for a given page. */
export function pageWindow({ page, pageSize }: { page: number; pageSize: number }) {
  return { skip: (page - 1) * pageSize, take: pageSize }
}

export function toPage<T>(
  items: T[],
  total: number,
  { page, pageSize }: { page: number; pageSize: number },
): Page<T> {
  return { items, page, pageSize, total, hasMore: page * pageSize < total }
}
