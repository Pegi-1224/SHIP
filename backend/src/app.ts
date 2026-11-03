import cors from '@fastify/cors'
import Fastify from 'fastify'
import { config } from './config.js'
import { errorHandler, notFoundHandler } from './lib/errors.js'
import { assessmentRoutes } from './routes/assessment.js'
import { authRoutes } from './routes/auth.js'
import { companyRoutes } from './routes/companies.js'
import { demoCompanyRoutes } from './routes/demoCompanies.js'
import { demoPostRoutes } from './routes/demoPosts.js'
import { discussionRoutes } from './routes/discussions.js'
import { healthRoutes } from './routes/health.js'
import { homeRoutes } from './routes/home.js'
import { meRoutes } from './routes/me.js'

export async function buildApp() {
  const app = Fastify({ logger: true })

  await app.register(cors, {
    origin: config.corsOrigins,
    credentials: true,
    // The plugin's default allows only GET, HEAD and POST; the API also uses PUT and DELETE.
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  })

  app.decorateRequest('user', null)

  app.setErrorHandler(errorHandler)
  app.setNotFoundHandler(notFoundHandler)

  // Every endpoint lives under /api, matching the frontend's VITE_API_BASE_URL.
  await app.register(
    async (api) => {
      await api.register(healthRoutes)
      await api.register(authRoutes)
      await api.register(assessmentRoutes)
      await api.register(meRoutes)
      await api.register(homeRoutes)
      await api.register(discussionRoutes)
      await api.register(companyRoutes)
      await api.register(demoCompanyRoutes)
      await api.register(demoPostRoutes)
    },
    { prefix: '/api' },
  )

  return app
}
