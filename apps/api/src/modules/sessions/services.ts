import { randomUUID } from 'node:crypto'
import { messagesToUIMessages } from '@anvia/client'
import { createMemoryScopeKey, memoryStore, prisma } from '@ultrasakti/db'
import type { SessionListInput } from './schema'

const pageSize = 30

export async function createSession(userId: string) {
  const sessionId = randomUUID()
  const session = await prisma.agentMemorySession.create({
    data: {
      id: sessionId,
      sessionId,
      userId,
      scopeKey: createMemoryScopeKey({ scope: { sessionId, userId } }),
      metadata: {},
    },
    select: { sessionId: true, createdAt: true, updatedAt: true },
  })
  return { ...session, title: 'New chat' }
}

export async function listSessions(userId: string, { offset }: SessionListInput) {
  const rows = await prisma.agentMemorySession.findMany({
    where: { userId },
    orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
    skip: offset,
    take: pageSize + 1,
    select: {
      sessionId: true,
      createdAt: true,
      updatedAt: true,
      messages: {
        where: { role: 'user' },
        orderBy: { position: 'asc' },
        take: 1,
        select: { message: true },
      },
    },
  })
  return {
    sessions: rows.slice(0, pageSize).map(({ messages, ...session }) => {
      const first = messages[0]?.message
      const content =
        first && typeof first === 'object' && !Array.isArray(first) ? first.content : null
      return { ...session, title: typeof content === 'string' ? content.slice(0, 80) : 'New chat' }
    }),
    nextOffset: rows.length > pageSize ? offset + pageSize : null,
  }
}

export async function getSession(userId: string, sessionId: string) {
  const session = await prisma.agentMemorySession.findFirst({
    where: { sessionId, userId },
    select: { sessionId: true },
  })
  if (!session) return null

  const messages = await memoryStore.load({ scope: { sessionId, userId } })
  // The chat UI exposes conversation text, not internal reasoning or tool payloads.
  const visibleMessages = messagesToUIMessages(
    messages.filter((message) => message.role === 'user' || message.role === 'assistant'),
  ).map(({ id, role, parts }) => ({
    id,
    role,
    parts: parts.filter((part) => part.type === 'text'),
  }))
  return { sessionId, messages: visibleMessages.filter((message) => message.parts.length > 0) }
}

const imageTypes: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
}
const downloadTypes: Record<string, string> = {
  csv: 'text/csv',
  json: 'application/json',
  txt: 'text/plain',
  pdf: 'application/pdf',
}

export function artifactContentType(name: string) {
  const extension = name.split('.').pop()?.toLowerCase() ?? ''
  if (imageTypes[extension]) return { type: imageTypes[extension], inline: true }
  return { type: downloadTypes[extension] ?? 'application/octet-stream', inline: false }
}

export function ownsSession(userId: string, sessionId: string) {
  return prisma.agentMemorySession.findFirst({
    where: { sessionId, userId },
    select: { sessionId: true },
  })
}
