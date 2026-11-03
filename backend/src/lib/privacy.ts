import type { CompanyRecord, CompanyUserReported } from '../types/demo.js'

import { MIN_ELIGIBLE_CONTRIBUTORS } from './constants.js'

/**
 * Keep the count but replace every other value with `null`. The real aggregates stay in
 * the database; below the threshold they never leave the server.
 */
function withhold<T extends { submissions: number }>(area: T | null): T | null {
  if (!area || area.submissions >= MIN_ELIGIBLE_CONTRIBUTORS) return area
  const hidden = { ...area } as Record<string, unknown>
  for (const key of Object.keys(hidden)) {
    if (key !== 'submissions') hidden[key] = null
  }
  return hidden as T
}

export function withPrivacyThreshold(company: CompanyRecord): CompanyRecord {
  const reported: CompanyUserReported = company.userReported
  return {
    ...company,
    userReported: {
      salary: withhold(reported.salary),
      promotion: withhold(reported.promotion),
      diversity: withhold(reported.diversity),
      maternity: withhold(reported.maternity),
      benefits: withhold(reported.benefits),
    },
  }
}
