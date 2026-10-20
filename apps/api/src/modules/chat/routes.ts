import { parseClientStreamRequest } from '@anvia/client'
import { createClientStreamResponse } from '@anvia/server'
import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { auth } from '../auth/auth'
import { chatRequestSchema } from './schema'
import { findChatSession, streamChat } from './services'

export const chatRoutes = new Hono()

chatRoutes.post('/', zValidator('json', chatRequestSchema), async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (!session) return c.json({ error: 'Unauthorized' }, 401)

  const body = c.req.valid('json')
  parseClientStreamRequest(body)
  const { sessionId } = body.metadata
  const userId = session.user.id
  try {
    if (!(await findChatSession(sessionId, userId))) {
      return c.json({ error: 'Session not found' }, 404)
    }
    return createClientStreamResponse({
      events: streamChat(
        body.type === 'messages'
          ? { type: 'messages', prompt: body.messages[0].content }
          : {
              type: 'interaction_response',
              interactionId: body.interactionId,
              response: body.response,
            },
        { sessionId, userId },
        c.req.raw.signal,
      ),
      format: 'jsonl',
    })
  } catch {
    return c.json({ error: 'Assistant is unavailable' }, 503)
  }
})
