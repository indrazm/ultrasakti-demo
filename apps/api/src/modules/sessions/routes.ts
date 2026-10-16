import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { auth } from '../auth/auth'
import { createSessionSchema, sessionListSchema, sessionParamsSchema } from './schema'
import { createSession, getSession, listSessions } from './services'

export const sessionsRoutes = new Hono<{ Variables: { userId: string } }>()

sessionsRoutes.onError((error, c) => {
  if (error instanceof HTTPException) return c.json({ error: error.message }, error.status)
  console.error('Session request failed', error.name)
  return c.json({ error: 'Conversations are unavailable. Please try again.' }, 503)
})

sessionsRoutes.use('*', async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (!session) return c.json({ error: 'Unauthorized' }, 401)
  c.set('userId', session.user.id)
  await next()
})

sessionsRoutes.get('/', zValidator('query', sessionListSchema), async (c) =>
  c.json(await listSessions(c.get('userId'), c.req.valid('query'))),
)

sessionsRoutes.post(
  '/',
  async (c, next) => {
    if (c.req.header('content-type')?.split(';')[0]?.trim().toLowerCase() !== 'application/json') {
      return c.json({ error: 'Expected application/json' }, 415)
    }
    await next()
  },
  zValidator('json', createSessionSchema),
  async (c) => c.json({ session: await createSession(c.get('userId')) }, 201),
)

sessionsRoutes.get('/:sessionId', zValidator('param', sessionParamsSchema), async (c) => {
  const session = await getSession(c.get('userId'), c.req.valid('param').sessionId)
  return session ? c.json(session) : c.json({ error: 'Session not found' }, 404)
})
