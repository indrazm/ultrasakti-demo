import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { auth } from '../auth/auth'
import { readSandboxArtifact } from '@ultrasakti/runtime'
import {
  artifactParamsSchema,
  createSessionSchema,
  sessionListSchema,
  sessionParamsSchema,
} from './schema'
import {
  artifactContentType,
  createSession,
  getSession,
  listSessions,
  ownsSession,
} from './services'

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

// Serves files the agent saved in this conversation's sandbox. Images render inline; anything else
// is a download, and a sandbox CSP stops served files from running script.
sessionsRoutes.get(
  '/:sessionId/artifacts/:name',
  zValidator('param', artifactParamsSchema),
  async (c) => {
    const { sessionId, name } = c.req.valid('param')
    if (!(await ownsSession(c.get('userId'), sessionId))) {
      return c.json({ error: 'Session not found' }, 404)
    }
    const data = await readSandboxArtifact(c.get('userId'), sessionId, name)
    if (!data) return c.json({ error: 'File not found or expired' }, 404)
    const { type, inline } = artifactContentType(name)
    c.header('Content-Type', type)
    c.header('Content-Security-Policy', 'sandbox')
    c.header('Cache-Control', 'private, no-store')
    c.header(
      'Content-Disposition',
      `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(name)}`,
    )
    return c.body(data as Uint8Array<ArrayBuffer>)
  },
)
