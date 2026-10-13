/**
 * Option lists used by the submission and add-company forms.
 *
 * These are domain vocabulary, not mock data, which is why they live in
 * `shared/config` rather than `src/mocks`. Pages read them directly; the mock
 * backend imports the same lists so seeded data and form options never drift.
 *
 * In production these lists should come from the backend so they can change
 * without a frontend release - see docs/api-contract.md, "Reference data".
 */

/** Roles offered by the salary and promotion sections (spec 6.4). */
export const ROLE_OPTIONS = [
  'Software Engineer',
  'Data Scientist',
  'Product Manager',
  'Designer',
  'Program Manager',
  'Nurse Practitioner',
  'Financial Analyst',
  'Consultant',
  'Marketing Manager',
  'Operations Manager',
  'Other',
] as const;

/** US cities offered by the submission and add-company forms (spec 6.4). */
export const US_CITY_OPTIONS = [
  'Atlanta, GA',
  'Austin, TX',
  'Boston, MA',
  'Chicago, IL',
  'Denver, CO',
  'Houston, TX',
  'Los Angeles, CA',
  'Miami, FL',
  'Minneapolis, MN',
  'New York, NY',
  'Philadelphia, PA',
  'Phoenix, AZ',
  'Portland, OR',
  'Raleigh, NC',
  'San Diego, CA',
  'San Francisco, CA',
  'Seattle, WA',
  'Washington, DC',
] as const;
