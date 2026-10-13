/**
 * The mock backend's database.
 *
 * It is a plain object held in memory and mirrored into `localStorage`, so the
 * demo survives a page reload. Everything in it is fictional sample data - see
 * `src/mocks/fixtures`. Nothing here is a production store and nothing here is
 * private: `localStorage` is readable by any script on the origin.
 *
 * Reset the data at any time with the "Reset demo data" button on the Profile
 * page, or by calling `resetMockDatabase()` from the browser console.
 */
import type { MockDatabase } from './types';
import { COMPANY_FIXTURES } from './fixtures/companies';
import { SEED_USERS } from './fixtures/users';
import { buildSeedSubmissions } from './fixtures/submissions';
import { buildSeedComments, buildSeedPosts } from './fixtures/discussions';

const STORAGE_KEY = 'ship.mock.db';

/** Bump this whenever the stored shape changes; older copies are discarded. */
const DB_VERSION = 1;

function createSeedDatabase(): MockDatabase {
  const publicData: MockDatabase['publicData'] = {};
  for (const fixture of COMPANY_FIXTURES) {
    publicData[fixture.company.id] = fixture.publicData;
  }

  return {
    version: DB_VERSION,
    users: SEED_USERS.map((user) => ({ ...user })),
    sessions: {},
    emailCodes: [],
    assessments: [],
    companies: COMPANY_FIXTURES.map((fixture) => ({ ...fixture.company })),
    publicData,
    submissions: buildSeedSubmissions(),
    posts: buildSeedPosts(),
    comments: buildSeedComments(),
    conversations: [],
    messages: [],
    readPosts: {},
    customTags: [],
  };
}

function readStored(): MockDatabase | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MockDatabase;
    if (parsed.version !== DB_VERSION) return null;
    return parsed;
  } catch {
    // Private windows, blocked site data, or a corrupted value: start fresh.
    return null;
  }
}

let database: MockDatabase = (() => {
  if (typeof window === 'undefined') return createSeedDatabase();
  return readStored() ?? createSeedDatabase();
})();

/** Write the current state back to storage. Called after every mutation. */
export function persist(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(database));
  } catch {
    // Storage full or unavailable. The in-memory copy still works for this
    // session, so the demo continues rather than failing the request.
  }
}

export function db(): MockDatabase {
  return database;
}

/** Discard all demo state and reseed. Used by the Profile reset button and tests. */
export function resetMockDatabase(): void {
  database = createSeedDatabase();
  persist();
}

/** Replace the whole database. Tests use this to arrange a specific scenario. */
export function setMockDatabase(next: MockDatabase): void {
  database = next;
  persist();
}

let idCounter = 0;

/** Monotonic ids so ordering by id matches insertion order within a session. */
export function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${Date.now().toString(36)}${idCounter.toString(36)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}
