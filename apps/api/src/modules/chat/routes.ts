import { parseClientStreamRequest, type ClientStreamRequest } from '@anvia/client'
import { createClientStreamResponse } from '@anvia/server'
import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { auth } from '../auth/auth'
import { chatRequestSchema } from './schema'
import { streamChat } from './services'

export const chatRoutes = new Hono()

chatRoutes.post('/', zValidator('json', chatRequestSchema), async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (!session) return c.json({ error: 'Unauthorized' }, 401)

  let body: Extract<ClientStreamRequest, { type: 'messages' }>
  try {
    const parsed = parseClientStreamRequest(c.req.valid('json'))
    if (parsed.type !== 'messages') return c.json({ error: 'Unsupported request' }, 400)
    body = parsed
    if (body.messages.some((message) => message.role === 'system' || message.role === 'tool')) {
      return c.json({ error: 'Unsupported message role' }, 400)
    }
    if (body.messages.at(-1)?.role !== 'user') {
      return c.json({ error: 'The last message must be from the user' }, 400)
    }
    const text = body.messages.map((message) =>
      typeof message.content === 'string'
        ? message.content
        : message.content
            .filter((part) => part.type === 'text')
            .map((part) => part.text)
            .join(''),
    )
    if (text.some((value) => value.length > 4_000) || !text.at(-1)?.trim()) {
      return c.json({ error: 'Invalid message text' }, 400)
    }
  } catch {
    return c.json({ error: 'Invalid chat request' }, 400)
  }

  try {
    return createClientStreamResponse({ events: streamChat(body), format: 'jsonl' })
  } catch {
    return c.json({ error: 'Assistant is unavailable' }, 503)
  }
})
