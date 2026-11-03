import cors from '@fastify/cors'
import Fastify from 'fastify'
import { config } from './config.js'
import { errorHandler, notFoundHandler } from './lib/errors.js'
import { healthRoutes } from './routes/health.js'

export async function buildApp() {
  const app = Fastify({ logger: true })

  await app.register(cors, {
    origin: config.corsOrigins,
    credentials: true,
  })

  app.setErrorHandler(errorHandler)
  app.setNotFoundHandler(notFoundHandler)

  // Every endpoint lives under /api, matching the frontend's VITE_API_BASE_URL.
  await app.register(
    async (api) => {
      await api.register(healthRoutes)
    },
    { prefix: '/api' },
  )

  return app
}
