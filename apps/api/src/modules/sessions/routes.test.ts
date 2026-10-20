import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryScopeKey, memoryStore, prisma } from '@ultrasakti/db'
import { readSandboxArtifact } from '@ultrasakti/runtime'
import { app } from '../../index'
import { auth } from '../auth/auth'

const sessionId = '00000000-0000-4000-8000-000000000001'
const timestamp = new Date('2026-10-16T00:00:00Z')

vi.mock('../auth/auth', () => ({
  auth: {
    handler: vi.fn(),
    api: { getSession: vi.fn().mockResolvedValue({ user: { id: 'owner' } }) },
  },
  platformOrigin: 'http://localhost:5173',
}))
vi.mock('@ultrasakti/db', () => ({
  prisma: { agentMemorySession: { create: vi.fn(), findFirst: vi.fn(), findMany: vi.fn() } },
  memoryStore: { load: vi.fn() },
  createMemoryScopeKey: vi.fn().mockReturnValue('scoped-key'),
}))

vi.mock('@ultrasakti/runtime', () => ({ readSandboxArtifact: vi.fn() }))

beforeEach(() => vi.clearAllMocks())

describe('sessions API', () => {
  it.each([
    ['GET', '/api/sessions'],
    ['POST', '/api/sessions'],
    ['GET', `/api/sessions/${sessionId}`],
    ['GET', `/api/sessions/${sessionId}/artifacts/chart.png`],
  ])('requires authentication for %s %s', async (method, path) => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(null)
    const response = await app.request(path, { method })
    expect(response.status).toBe(401)
    expect(prisma.agentMemorySession.create).not.toHaveBeenCalled()
    expect(prisma.agentMemorySession.findMany).not.toHaveBeenCalled()
    expect(memoryStore.load).not.toHaveBeenCalled()
  })

  it('returns a safe error when session storage is unavailable', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(prisma.agentMemorySession.findMany).mockRejectedValueOnce(
      new Error('private database detail'),
    )
    const response = await app.request('/api/sessions')
    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({
      error: 'Conversations are unavailable. Please try again.',
    })
    expect(log).toHaveBeenCalledWith('Session request failed', 'Error')
  })

  it('rejects form submissions and caller-selected owners or session IDs', async () => {
    const form = await app.request('/api/sessions', { method: 'POST', body: 'ignored' })
    expect(form.status).toBe(415)
    const forged = await app.request('/api/sessions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ userId: 'victim', sessionId }),
    })
    expect(forged.status).toBe(400)
    expect(prisma.agentMemorySession.create).not.toHaveBeenCalled()
  })

  it('returns a client error for malformed JSON without accessing storage', async () => {
    const response = await app.request('/api/sessions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{',
    })
    expect(response.status).toBe(400)
    expect(prisma.agentMemorySession.create).not.toHaveBeenCalled()
  })

  it('creates a server-generated session owned by the authenticated user', async () => {
    vi.mocked(prisma.agentMemorySession.create).mockResolvedValueOnce({
      sessionId,
      createdAt: timestamp,
      updatedAt: timestamp,
    } as never)
    const response = await app.request('/api/sessions', {
      method: 'POST',
      headers: { origin: 'http://localhost:5173', 'content-type': 'application/json' },
      body: '{}',
    })
    expect(response.status).toBe(201)
    expect(response.headers.get('access-control-allow-origin')).toBe('http://localhost:5173')
    expect(response.headers.get('access-control-allow-credentials')).toBe('true')
    expect(createMemoryScopeKey).toHaveBeenCalledWith({
      scope: { sessionId: expect.any(String), userId: 'owner' },
    })
    expect(prisma.agentMemorySession.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: 'owner', scopeKey: 'scoped-key', metadata: {} }),
      }),
    )
    expect(await response.json()).toMatchObject({ session: { sessionId, title: 'New chat' } })
  })

  it('lists only the user’s sessions with titles and pagination', async () => {
    vi.mocked(prisma.agentMemorySession.findMany).mockResolvedValueOnce(
      Array.from({ length: 31 }, (_, i) => ({
        sessionId: `session-${i}`,
        createdAt: timestamp,
        updatedAt: timestamp,
        messages: [{ message: { role: 'user', content: 'Plan my week' } }],
      })) as never,
    )
    const response = await app.request('/api/sessions?offset=30')
    const data = await response.json()
    expect(response.status).toBe(200)
    expect(data.sessions).toHaveLength(30)
    expect(data.sessions[0].title).toBe('Plan my week')
    expect(data.nextOffset).toBe(60)
    expect(prisma.agentMemorySession.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'owner' }, skip: 30, take: 31 }),
    )
  })

  it('does not load the history of a missing or foreign session', async () => {
    vi.mocked(prisma.agentMemorySession.findFirst).mockResolvedValueOnce(null)
    const response = await app.request(`/api/sessions/${sessionId}`)
    expect(response.status).toBe(404)
    expect(prisma.agentMemorySession.findFirst).toHaveBeenCalledWith({
      where: { sessionId, userId: 'owner' },
      select: { sessionId: true },
    })
    expect(memoryStore.load).not.toHaveBeenCalled()
  })

  it('hydrates conversation text without exposing tool payloads or system prompts', async () => {
    vi.mocked(prisma.agentMemorySession.findFirst).mockResolvedValueOnce({ sessionId } as never)
    vi.mocked(memoryStore.load).mockResolvedValueOnce([
      { role: 'system', content: 'private instructions' },
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Welcome back' },
    ])
    const response = await app.request(`/api/sessions/${sessionId}`)
    const body = await response.text()
    expect(response.status).toBe(200)
    expect(body).toContain('Hello')
    expect(body).toContain('Welcome back')
    expect(body).not.toContain('private instructions')
    expect(memoryStore.load).toHaveBeenCalledWith({ scope: { sessionId, userId: 'owner' } })
  })

  it('replays tool calls with their arguments but not their results', async () => {
    vi.mocked(prisma.agentMemorySession.findFirst).mockResolvedValueOnce({ sessionId } as never)
    vi.mocked(memoryStore.load).mockResolvedValueOnce([
      { role: 'user', content: 'List orders' },
      {
        role: 'assistant',
        content: [
          {
            type: 'tool-call',
            toolCallId: 'call-1',
            toolName: 'list_orders',
            input: { status: 'draft' },
          },
        ],
      },
      {
        role: 'tool',
        content: [
          {
            type: 'tool-result',
            toolCallId: 'call-1',
            toolName: 'list_orders',
            output: { type: 'text', value: 'SECRET-RESULT' },
          },
        ],
      },
      { role: 'assistant', content: 'Here they are' },
    ] as never)
    const body = await (await app.request(`/api/sessions/${sessionId}`)).text()
    expect(body).toContain('list_orders')
    expect(body).toContain('draft')
    expect(body).not.toContain('SECRET-RESULT')
  })

  it.each(['/api/sessions/not-a-uuid', '/api/sessions?offset=-1', '/api/sessions?offset=nope'])(
    'validates %s',
    async (path) => {
      expect((await app.request(path)).status).toBe(400)
    },
  )

  describe('artifacts', () => {
    const path = `/api/sessions/${sessionId}/artifacts/chart.png`

    it('serves an image inline to the session owner', async () => {
      vi.mocked(prisma.agentMemorySession.findFirst).mockResolvedValueOnce({ sessionId } as never)
      vi.mocked(readSandboxArtifact).mockResolvedValueOnce(new Uint8Array([137, 80, 78, 71]))
      const response = await app.request(path)
      expect(response.status).toBe(200)
      expect(response.headers.get('content-type')).toBe('image/png')
      expect(response.headers.get('content-disposition')).toContain('inline')
      expect(response.headers.get('content-security-policy')).toBe('sandbox')
      expect(readSandboxArtifact).toHaveBeenCalledWith('owner', sessionId, 'chart.png')
    })

    it('serves svg charts inline', async () => {
      vi.mocked(prisma.agentMemorySession.findFirst).mockResolvedValueOnce({ sessionId } as never)
      vi.mocked(readSandboxArtifact).mockResolvedValueOnce(new Uint8Array([60, 115]))
      const response = await app.request(`/api/sessions/${sessionId}/artifacts/chart.svg`)
      expect(response.headers.get('content-type')).toBe('image/svg+xml')
      expect(response.headers.get('content-disposition')).toContain('inline')
      expect(response.headers.get('content-security-policy')).toBe('sandbox')
    })

    it('serves non-image files as downloads', async () => {
      vi.mocked(prisma.agentMemorySession.findFirst).mockResolvedValueOnce({ sessionId } as never)
      vi.mocked(readSandboxArtifact).mockResolvedValueOnce(new Uint8Array([1]))
      const response = await app.request(`/api/sessions/${sessionId}/artifacts/page.html`)
      expect(response.headers.get('content-type')).toBe('application/octet-stream')
      expect(response.headers.get('content-disposition')).toContain('attachment')
    })

    it('does not read files for a session the user does not own', async () => {
      vi.mocked(prisma.agentMemorySession.findFirst).mockResolvedValueOnce(null)
      const response = await app.request(path)
      expect(response.status).toBe(404)
      expect(readSandboxArtifact).not.toHaveBeenCalled()
    })

    it('returns 404 when the file is missing or expired', async () => {
      vi.mocked(prisma.agentMemorySession.findFirst).mockResolvedValueOnce({ sessionId } as never)
      vi.mocked(readSandboxArtifact).mockResolvedValueOnce(undefined)
      expect((await app.request(path)).status).toBe(404)
    })

    it('rejects an invalid file name', async () => {
      const response = await app.request(`/api/sessions/${sessionId}/artifacts/.hidden`)
      expect(response.status).toBe(400)
      expect(readSandboxArtifact).not.toHaveBeenCalled()
    })
  })
})
