import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { serve } from '@hono/node-server'
import { prisma } from '@ultrasakti/db'
import { closeMcpConnection, closeRuntimeObservability } from '@ultrasakti/runtime'
import { app } from './index'
import { createWebRoutes } from './modules/web/routes'

const production = process.env.NODE_ENV === 'production'
if (production) {
  const root = fileURLToPath(new URL('../../platform/dist/', import.meta.url))
  if (!existsSync(`${root}/index.html`))
    throw new Error('Build the platform before starting production')
  app.route('/', createWebRoutes(root))
}

const hostname = production ? '127.0.0.1' : '0.0.0.0'
const port = Number(process.env.PORT ?? 3000)
const server = serve({ fetch: app.fetch, hostname, port }, (info) => {
  console.log(`API listening on http://${hostname}:${info.port}`)
  process.send?.('ready')
})

let shuttingDown = false
const shutdown = () => {
  if (shuttingDown) return
  shuttingDown = true
  const timeout = setTimeout(() => {
    console.error('API shutdown timed out')
    process.exit(1)
  }, 30_000)
  server.close(async (error) => {
    try {
      await Promise.all([closeMcpConnection(), closeRuntimeObservability(), prisma.$disconnect()])
      process.exit(error ? 1 : 0)
    } catch {
      console.error('Failed to close runtime observability')
      process.exit(1)
    } finally {
      clearTimeout(timeout)
    }
  })
}
process.once('SIGINT', shutdown)
process.once('SIGTERM', shutdown)
