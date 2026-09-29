import { serve } from '@hono/node-server'
import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { z } from 'zod'
import { auth, platformOrigin } from './modules/auth/auth'
import { chatRoutes } from './modules/chat/routes'

export const app = new Hono()

app.use('/api/auth/*', cors({ origin: platformOrigin, credentials: true }))
app.all('/api/auth/*', (c) => auth.handler(c.req.raw))
app.use(
  '/api/chat',
  cors({
    origin: platformOrigin,
    credentials: true,
    exposeHeaders: ['x-anvia-stream-protocol'],
  }),
)
app.route('/api/chat', chatRoutes)

app.get('/api/health', (c) => c.json({ status: 'ok' }))

app.post('/api/echo', zValidator('json', z.object({ message: z.string().min(1) })), (c) =>
  c.json({ message: c.req.valid('json').message }),
)

if (!process.env.VITEST) {
  const port = Number(process.env.PORT ?? 3000)
  serve({ fetch: app.fetch, port }, (info) => {
    console.log(`API listening on http://localhost:${info.port}`)
  })
}
