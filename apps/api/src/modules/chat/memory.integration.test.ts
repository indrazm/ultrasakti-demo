import { randomUUID } from 'node:crypto'
import { expect, it, vi } from 'vitest'
import { createAgent, type CompletionModel } from '@ultrasakti/runtime'

// Run with the package's with-env script against the local migrated database.
it.skipIf(!process.env.DATABASE_URL)(
  'persists agent turns, reloads them, and isolates conversations and owners',
  async () => {
    const { memoryStore, prisma } = await import('@ultrasakti/db')
    const { createSession, getSession, listSessions } = await import('../sessions/services')
    const userId = `memory-test-${randomUUID()}`
    const otherUserId = `memory-test-${randomUUID()}`
    const completion = vi.fn<CompletionModel['completion']>().mockResolvedValue({
      choice: [{ type: 'text', text: 'I remember your note.' }],
      usage: {
        inputTokens: 1,
        outputTokens: 1,
        totalTokens: 2,
        cachedInputTokens: 0,
        cacheCreationInputTokens: 0,
      },
      rawResponse: {},
      finishReason: 'stop',
    })
    const model: CompletionModel = {
      provider: 'test',
      modelId: 'memory-test',
      capabilities: {
        streaming: false,
        tools: false,
        toolChoice: false,
        imageInput: false,
        documentInput: false,
        outputSchema: false,
        reasoning: false,
      },
      completion,
    }
    try {
      await memoryStore.validate()
      const first = await createSession(userId)
      const second = await createSession(userId)
      const agent = createAgent({
        model,
        tools: [],
        instructions: 'Remember user notes.',
        memory: { store: memoryStore, savePolicy: 'turn' },
      })
      const scope = { sessionId: first.sessionId, userId }
      await agent.generate({ prompt: 'My project is Cedar.', session: scope })
      const persisted = await memoryStore.load({ scope })
      expect(persisted.map((message) => message.role)).toEqual(['user', 'assistant'])
      expect(JSON.stringify(persisted)).toContain('Cedar')

      // A fresh agent must recover history from PostgreSQL, with no client transcript.
      const streamingModel = {
        ...model,
        capabilities: { ...model.capabilities, streaming: true },
        async *streamCompletion(request: Parameters<CompletionModel['completion']>[0]) {
          const response = await completion(request)
          yield { type: 'text_delta' as const, delta: 'I remember your note.' }
          yield { type: 'final' as const, response }
        },
      }
      const reloaded = createAgent({
        model: streamingModel,
        tools: [],
        instructions: 'Remember user notes.',
        memory: { store: memoryStore, savePolicy: 'turn' },
      })
      for await (const event of reloaded.stream({
        prompt: 'What is my project?',
        session: scope,
      })) {
        if (event.type === 'error') throw event.error
      }
      expect(JSON.stringify(completion.mock.calls[1][0].chatHistory)).toContain('Cedar')
      expect(
        (await memoryStore.load({ scope })).filter((message) => message.role === 'user'),
      ).toHaveLength(2)
      expect(await memoryStore.load({ scope: { sessionId: second.sessionId, userId } })).toEqual([])
      expect(
        await memoryStore.load({ scope: { sessionId: first.sessionId, userId: otherUserId } }),
      ).toEqual([])
      expect(await getSession(otherUserId, first.sessionId)).toBeNull()
      const history = await getSession(userId, first.sessionId)
      expect(history?.messages).toHaveLength(4)
      expect(JSON.stringify(history)).toContain('Cedar')
      const listing = await listSessions(userId, { offset: 0 })
      expect(listing.sessions.find((session) => session.sessionId === first.sessionId)?.title).toBe(
        'My project is Cedar.',
      )
    } finally {
      await prisma.agentMemorySession.deleteMany({ where: { userId } })
      await prisma.$disconnect()
    }
  },
)
