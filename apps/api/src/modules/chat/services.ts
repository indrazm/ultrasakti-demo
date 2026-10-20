import { agentToClientStream } from '@anvia/client'
import { memoryStore, prisma } from '@ultrasakti/db'
import { createAgent, getMcpConnection } from '@ultrasakti/runtime'

export function findChatSession(sessionId: string, userId: string) {
  return prisma.agentMemorySession.findFirst({
    where: { sessionId, userId },
    select: { sessionId: true },
  })
}

async function* streamAgentEvents(
  prompt: string,
  session: { sessionId: string; userId: string },
  abortSignal?: AbortSignal,
) {
  const mcp = await getMcpConnection()
  const agent = createAgent({
    memory: { store: memoryStore, savePolicy: 'turn' },
    mcpServers: mcp.servers,
  })
  yield* agent.stream({ prompt, session, abortSignal })
}

export function streamChat(
  prompt: string,
  session: { sessionId: string; userId: string },
  abortSignal?: AbortSignal,
) {
  return agentToClientStream({
    events: streamAgentEvents(prompt, session, abortSignal),
    mapError: (error) => {
      console.error('Chat stream failed', error instanceof Error ? error.name : 'UnknownError')
      return { message: 'The assistant could not complete this response.' }
    },
  })
}
