import { normalizeCompanyName } from './search.js'

/**
 * Lower-case hostname without `www.`, or `null` when `website` is not a URL. This is the
 * duplicate key for companies: "Acme" and "Acme, Inc." are one employer if they share a host.
 */
export function hostnameOf(website: string): string | null {
  try {
    const { hostname } = new URL(website)
    return hostname.toLowerCase().replace(/^www\./, '') || null
  } catch {
    return null
  }
}

/** A URL-safe id from a company name, e.g. "Acme, Inc." -> "acme". */
export function slugFor(name: string): string {
  const slug = normalizeCompanyName(name)
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return slug || 'company'
}
