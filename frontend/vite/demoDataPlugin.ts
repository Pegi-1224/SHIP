/**
 * Dev-server plugin that writes user reports from the demo company page into
 * `src/mocks/data/companies.json`, so they are still there after a reload and
 * show up in `git diff`.
 *
 *   POST /__demo-data/companies/:companyId/reports   body: a DemoReport
 *   -> 200 with the company as saved
 *
 * The mock API (src/mocks/handlers/demoSearch.ts) calls this after accepting a
 * report. It only exists under `npm run dev`; a production build has no way to
 * write files. The real backend replaces it with a database (see
 * docs/demo-search.md).
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { normalizePath, type Plugin } from 'vite';
import type { CompanyRecord } from '../src/shared/types/demoSearch.ts';
import { applyReport, validateReport } from '../src/shared/utils/demoReports.ts';

const ROUTE = '/__demo-data/companies';
const MAX_BODY_BYTES = 16 * 1024;

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

export function demoDataPlugin(): Plugin {
  let dataFile = '';
  /** What we last wrote, so our own write does not reload the page. */
  let lastWritten: string | null = null;
  /** Writes run one at a time, so two reports cannot overwrite each other. */
  let queue: Promise<unknown> = Promise.resolve();

  async function addReport(companyId: string, input: unknown) {
    const raw = await readFile(dataFile, 'utf8');
    const eol = raw.includes('\r\n') ? '\r\n' : '\n';
    const companies = JSON.parse(raw) as CompanyRecord[];
    const company = companies.find((item) => item.id === companyId);
    if (!company) return { status: 404, body: { code: 'not_found', message: 'Unknown company.' } };

    const result = validateReport(input);
    if (!result.ok) {
      return {
        status: 422,
        body: {
          code: 'validation_error',
          message: 'Invalid report.',
          fieldErrors: result.fieldErrors,
        },
      };
    }

    company.userReported = applyReport(company.userReported, result.report);
    const next = `${JSON.stringify(companies, null, 2)}\n`.replace(/\n/g, eol);
    lastWritten = next;
    await writeFile(dataFile, next, 'utf8');
    return { status: 200, body: company };
  }

  return {
    name: 'ship-demo-data',
    apply: 'serve',

    configResolved(config) {
      dataFile = normalizePath(path.resolve(config.root, 'src/mocks/data/companies.json'));
    },

    configureServer(server) {
      server.middlewares.use(ROUTE, (req, res, next) => {
        const match = /^\/([a-z0-9-]+)\/reports\/?$/.exec(req.url ?? '');
        if (!match || req.method !== 'POST') {
          next();
          return;
        }
        const companyId = match[1] as string;

        const work = queue.then(async () => {
          let input: unknown;
          try {
            input = JSON.parse(await readBody(req));
          } catch {
            return { status: 400, body: { code: 'bad_request', message: 'Expected a JSON body.' } };
          }
          return addReport(companyId, input);
        });
        queue = work.catch(() => undefined);

        work
          .then(({ status, body }) => send(res, status, body))
          .catch((error: unknown) => {
            server.config.logger.error(`[ship-demo-data] ${String(error)}`);
            send(res, 500, { code: 'server_error', message: 'Could not save the report.' });
          });
      });
    },

    // Vite invalidates the JSON module either way, so the next reload reads the
    // new file; we only skip the immediate full-page reload for our own writes.
    async handleHotUpdate(ctx) {
      if (normalizePath(ctx.file) !== dataFile || lastWritten === null) return;
      if ((await ctx.read()) === lastWritten) return [];
    },
  };
}
