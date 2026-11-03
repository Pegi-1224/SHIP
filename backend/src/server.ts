import { buildApp } from './app.js'
import { config } from './config.js'
import { prisma } from './db/client.js'

const app = await buildApp()

async function shutdown() {
  await app.close()
  await prisma.$disconnect()
  process.exit(0)
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

try {
  await app.listen({ port: config.port, host: '0.0.0.0' })
} catch (error) {
  app.log.error(error)
  process.exit(1)
}
