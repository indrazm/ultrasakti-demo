import { join } from 'node:path'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'

export function createWebRoutes(root: string) {
  const routes = new Hono()
  routes.use('*', async (c, next) => {
    c.header('Cache-Control', 'no-cache')
    await next()
  })
  routes.all('/api', (c) => c.notFound())
  routes.all('/api/*', (c) => c.notFound())
  routes.use('/assets/*', async (c, next) => {
    await next()
    if (c.res.status === 200 || c.res.status === 206) {
      c.header('Cache-Control', 'public, max-age=31536000, immutable')
    }
  })
  routes.get('/assets/*', serveStatic({ root }))
  routes.all('/assets/*', (c) => c.notFound())
  routes.get('*', serveStatic({ root }))
  routes.get('*', serveStatic({ path: join(root, 'index.html') }))
  return routes
}
