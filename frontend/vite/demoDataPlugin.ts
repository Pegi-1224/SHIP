/**
 * Dev-server plugin that writes demo data changes into the JSON files under
 * `src/mocks/data`, so they are still there after a reload and show up in
 * `git diff`.
 *
 *   POST /__demo-data/companies/:companyId/reports   body: a DemoReport
 *   -> 200 with the company as saved               (companies.json)
 *
 *   POST /__demo-data/companies   body: { input: NewCompanyInput, submission: { id, authorRefId, submittedAt } }
 *   -> 200 with the new company as saved, its answers folded in; 409 when a
 *      company with the same name already exists          (companies.json)
 *
 *   POST /__demo-data/posts   body: a PostRecord
 *   -> 200 with the post as saved: added when its id is new, otherwise its
 *      title, content, tags and updatedAt replace the stored ones (posts.json)
 *
 * The mock API (src/mocks/handlers/demoSearch.ts) calls these after accepting
 * a report or a post; it has already checked sign-in and ownership. They only
 * exist under `npm run dev`; a production build has no way to write files.
 * The real backend replaces them with a database (see docs/demo-search.md).
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { normalizePath, type Plugin, type ViteDevServer } from 'vite';
import type { CompanyRecord, PostRecord } from '../src/shared/types/demoSearch.ts';
import { applyReport, validateReport } from '../src/shared/utils/demoReports.ts';
import { validateDemoPost } from '../src/shared/utils/demoPosts.ts';
import {
  buildNewCompany,
  companyIdFor,
  findSameCompany,
  validateNewCompany,
} from '../src/shared/utils/newCompany.ts';

const COMPANIES_ROUTE = '/__demo-data/companies';
const POSTS_ROUTE = '/__demo-data/posts';
/** Posts have no length limit for the writer, so allow a long one. */
const MAX_BODY_BYTES = 256 * 1024;

type Result = { status: number; body: unknown };

/** One JSON string, number, boolean or null. */
const PLAIN_VALUE = String.raw`(?:"(?:[^"\\]|\\.)*"|-?[\d.eE+-]+|true|false|null)`;
/** A multi-line `JSON.stringify` array holding only plain values; group 1 is its items. */
const INLINE_ARRAY = new RegExp(
  String.raw`\[\n\s+(${PLAIN_VALUE}(?:,\n\s+${PLAIN_VALUE})*)\n\s*\]`,
  'g',
);

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error('Body too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function send(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

function validationFailed(fieldErrors: Record<string, string[]>): Result {
  return {
    status: 422,
    body: { code: 'validation_error', message: 'Invalid input.', fieldErrors },
  };
}

export function demoDataPlugin(): Plugin {
  let companiesFile = '';
  let postsFile = '';
  /** What we last wrote to each file, so our own write does not reload the page. */
  const lastWritten = new Map<string, string>();
  /** Writes run one at a time, so two saves cannot overwrite each other. */
  let queue: Promise<unknown> = Promise.resolve();

  /**
   * Reads a JSON array file, lets `change` edit it, and writes it back in the
   * same style. `inlineArrays` keeps lists of plain values on one line, as
   * posts.json writes its tags, so a save only shows the post that changed.
   */
  async function updateFile<T>(
    file: string,
    change: (items: T[]) => Result,
    { inlineArrays = false } = {},
  ): Promise<Result> {
    const raw = await readFile(file, 'utf8');
    const eol = raw.includes('\r\n') ? '\r\n' : '\n';
    const items = JSON.parse(raw) as T[];
    const result = change(items);
    if (result.status !== 200) return result;

    let json = JSON.stringify(items, null, 2);
    if (inlineArrays) {
      json = json.replace(INLINE_ARRAY, (_, body: string) => `[${body.replace(/,\n\s+/g, ', ')}]`);
    }
    const next = `${json}\n`.replace(/\n/g, eol);
    lastWritten.set(file, next);
    await writeFile(file, next, 'utf8');
    return result;
  }

  function addReport(companyId: string, input: unknown) {
    return updateFile<CompanyRecord>(companiesFile, (companies) => {
      const company = companies.find((item) => item.id === companyId);
      if (!company) {
        return { status: 404, body: { code: 'not_found', message: 'Unknown company.' } };
      }

      const result = validateReport(input);
      if (!result.ok) return validationFailed(result.fieldErrors);

      company.userReported = applyReport(company.userReported, result.report);
      return { status: 200, body: company };
    });
  }

  function addCompany(body: unknown) {
    return updateFile<CompanyRecord>(companiesFile, (companies) => {
      const { input, submission } = (body ?? {}) as {
        input?: unknown;
        submission?: { id?: unknown; authorRefId?: unknown; submittedAt?: unknown };
      };
      const result = validateNewCompany(input);
      if (!result.ok) return validationFailed(result.fieldErrors);
      if (
        typeof submission?.id !== 'string' ||
        typeof submission.authorRefId !== 'string' ||
        typeof submission.submittedAt !== 'string'
      ) {
        return validationFailed({ submission: ['Expected the submission id, author and date.'] });
      }

      const existing = findSameCompany(result.value.company.name, companies);
      if (existing) {
        return {
          status: 409,
          body: {
            code: 'conflict',
            message: `${existing.name} is already listed.`,
            id: existing.id,
          },
        };
      }

      const id = companyIdFor(
        result.value.company.name,
        companies.map((company) => company.id),
      );
      const company = buildNewCompany(result.value, id, {
        id: submission.id,
        authorRefId: submission.authorRefId,
        submittedAt: submission.submittedAt,
      });
      companies.push(company);
      return { status: 200, body: company };
    });
  }

  function savePost(input: unknown) {
    return updateFile<PostRecord>(
      postsFile,
      (posts) => {
        const record = input as Partial<PostRecord> | null;
        if (typeof record?.id !== 'string' || !/^post_[a-z0-9_]+$/.test(record.id)) {
          return validationFailed({ id: ['Expected a post id.'] });
        }
        const result = validateDemoPost(record);
        if (!result.ok) return validationFailed(result.fieldErrors);

        const existing = posts.find((item) => item.id === record.id);
        if (existing) {
          Object.assign(existing, result.post, { updatedAt: record.updatedAt ?? null });
          return { status: 200, body: existing };
        }

        const created = { ...(record as PostRecord), ...result.post };
        posts.push(created);
        return { status: 200, body: created };
      },
      { inlineArrays: true },
    );
  }

  /** Runs `work` after every earlier write and sends its result. */
  function respond(
    server: ViteDevServer,
    req: IncomingMessage,
    res: ServerResponse,
    work: (input: unknown) => Promise<Result>,
  ) {
    const job = queue.then(async () => {
      let input: unknown;
      try {
        input = JSON.parse(await readBody(req));
      } catch {
        return { status: 400, body: { code: 'bad_request', message: 'Expected a JSON body.' } };
      }
      return work(input);
    });
    queue = job.catch(() => undefined);

    job
      .then(({ status, body }) => send(res, status, body))
      .catch((error: unknown) => {
        server.config.logger.error(`[ship-demo-data] ${String(error)}`);
        send(res, 500, { code: 'server_error', message: 'Could not save the change.' });
      });
  }

  return {
    name: 'ship-demo-data',
    apply: 'serve',

    configResolved(config) {
      companiesFile = normalizePath(path.resolve(config.root, 'src/mocks/data/companies.json'));
      postsFile = normalizePath(path.resolve(config.root, 'src/mocks/data/posts.json'));
    },

    configureServer(server) {
      server.middlewares.use(COMPANIES_ROUTE, (req, res, next) => {
        if (/^\/?$/.test(req.url ?? '') && req.method === 'POST') {
          respond(server, req, res, addCompany);
          return;
        }
        const match = /^\/([a-z0-9-]+)\/reports\/?$/.exec(req.url ?? '');
        if (!match || req.method !== 'POST') {
          next();
          return;
        }
        const companyId = match[1] as string;
        respond(server, req, res, (input) => addReport(companyId, input));
      });

      server.middlewares.use(POSTS_ROUTE, (req, res, next) => {
        if (!/^\/?$/.test(req.url ?? '') || req.method !== 'POST') {
          next();
          return;
        }
        respond(server, req, res, savePost);
      });
    },

    // Vite invalidates the JSON module either way, so the next reload reads the
    // new file; we only skip the immediate full-page reload for our own writes.
    async handleHotUpdate(ctx) {
      const written = lastWritten.get(normalizePath(ctx.file));
      if (written === undefined) return;
      if ((await ctx.read()) === written) return [];
    },
  };
}
