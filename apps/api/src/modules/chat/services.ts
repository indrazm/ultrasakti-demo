import { agentToClientStream } from '@anvia/client'
import { memoryStore, prisma } from '@ultrasakti/db'
import { createAgent } from '@ultrasakti/runtime'

export function findChatSession(sessionId: string, userId: string) {
  return prisma.agentMemorySession.findFirst({
    where: { sessionId, userId },
    select: { sessionId: true },
  })
}

export function streamChat(
  prompt: string,
  session: { sessionId: string; userId: string },
  abortSignal?: AbortSignal,
) {
  const agent = createAgent({ memory: { store: memoryStore, savePolicy: 'turn' } })
  return agentToClientStream({
    events: agent.stream({ prompt, session, abortSignal }),
    mapError: (error) => {
      console.error('Chat stream failed', error instanceof Error ? error.name : 'UnknownError')
      return { message: 'The assistant could not complete this response.' }
    },
  })
}
