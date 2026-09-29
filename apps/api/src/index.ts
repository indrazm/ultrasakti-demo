import { serve } from '@hono/node-server'
import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'

export const app = new Hono()

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
