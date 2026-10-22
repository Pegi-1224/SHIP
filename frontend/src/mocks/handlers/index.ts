/**
 * All mock request handlers, in the order MSW should try them.
 *
 * Order matters for overlapping paths: a literal route such as
 * `/companies/compare` must be registered before the parameterised
 * `/companies/:companyId`, or the literal would be swallowed by the parameter.
 * `companyHandlers` already lists them in the right order internally.
 */
import { authHandlers } from './auth';
import { assessmentHandlers } from './assessment';
import { companyHandlers } from './companies';
import { demoSearchHandlers } from './demoSearch';
import { discussionHandlers } from './discussions';
import { homeHandlers } from './home';
import { messageHandlers } from './messages';
import { profileHandlers } from './profile';

export const handlers = [
  ...authHandlers,
  ...assessmentHandlers,
  ...companyHandlers,
  ...demoSearchHandlers,
  ...discussionHandlers,
  ...homeHandlers,
  ...messageHandlers,
  ...profileHandlers,
];
