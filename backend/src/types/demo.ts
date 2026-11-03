/**
 * Response shapes of the `/demo/*` endpoints. These mirror
 * frontend/src/shared/types/demoSearch.ts - change them together.
 *
 * A missing value is `null`, never `0` or an empty string, so the UI can say
 * "Not published" instead of showing a misleading number.
 */

export interface CompanyContact {
  name: string
  role: string
  email: string
}

export interface CompanySourceLink {
  label: string
  url: string
}

export interface CompanyVerification {
  status: 'verified' | 'needs_review' | 'unverified'
  checkedBy: 'ai' | 'human'
  checkedAt: string | null
  confidence: number | null
  notes: string | null
}

export interface CompanySalaryInfo {
  averageAnnualUsd: number | null
  rangeUsd: { min: number; max: number } | null
  basis: string
  sourceUrl: string
}

export interface CompanyPromotionInfo {
  womenPromotionRatePct: number | null
  womenInManagementPct: number | null
  sourceUrl: string
}

export interface CompanyWomenSupport {
  womenWorkforcePct: number | null
  programs: string[]
}

export interface CompanyMaternityLeave {
  paidWeeks: number | null
  payPercent: number | null
  notes: string | null
}

export interface UserReportedSalary {
  submissions: number
  averageAnnualUsd: number | null
}

export interface UserReportedPromotion {
  submissions: number
  avgMonthsToPromotion: number | null
}

export interface UserReportedDiversity {
  submissions: number
  womanManagerPct: number | null
  womanInCSuitePct: number | null
  womenOnTeamPct: number | null
  feelIncludedPct: number | null
}

export interface UserReportedMaternity {
  submissions: number
  avgPaidWeeks: number | null
  avgPayPercent: number | null
}

export interface ReportedBenefit {
  name: string
  reports: number
}

export interface UserReportedBenefits {
  submissions: number
  items: ReportedBenefit[] | null
}

export interface CompanyUserReported {
  salary: UserReportedSalary | null
  promotion: UserReportedPromotion | null
  diversity: UserReportedDiversity | null
  maternity: UserReportedMaternity | null
  benefits: UserReportedBenefits | null
}

export interface CompanyRecord {
  id: string
  name: string
  website: string
  intro: string
  mainFocus: string[]
  location: string
  email: string
  phone: string
  address: string
  contacts: CompanyContact[]
  sources: CompanySourceLink[]
  /** `YYYY-MM-DD` */
  dataCollectedAt: string
  verification: CompanyVerification
  salary: CompanySalaryInfo | null
  promotion: CompanyPromotionInfo | null
  womenSupport: CompanyWomenSupport | null
  benefits: string[]
  paidMaternityLeave: CompanyMaternityLeave | null
  userReported: CompanyUserReported
}

export type PostStatus = 'published' | 'hidden' | 'removed'

export interface PostAuthor {
  refId: string
  /** "Anonymous" when the user has no display name. */
  displayName: string
  avatarUrl: string | null
  industry: string | null
  location: string | null
}

export interface PostPreview {
  id: string
  authorRefId: string
  title: string
  content: string
  tags: string[]
  relatedCompanyIds: string[]
  createdAt: string
  updatedAt: string | null
  commentCount: number
  status: PostStatus
  author: PostAuthor
}

export interface CommentPreview {
  id: string
  postId: string
  authorRefId: string
  content: string
  createdAt: string
  status: PostStatus
  author: PostAuthor
}

export interface SearchHit<T> {
  item: T
  /** 0-1, higher is a closer match. */
  score: number
}
