import { agentToClientStream } from '@anvia/client'
import { memoryStore, prisma } from '@ultrasakti/db'
import { createAgent, getMcpConnection, getSandboxToolset } from '@ultrasakti/runtime'

export function findChatSession(sessionId: string, userId: string) {
  return prisma.agentMemorySession.findFirst({
    where: { sessionId, userId },
    select: { sessionId: true },
  })
}

type ChatSession = { sessionId: string; userId: string }
type Continuation = Parameters<ReturnType<typeof createAgent>['resume']>[0]

// Paused runs live in this process only (the API runs as a single PM2 process). The continuation
// never reaches the browser; an approval is accepted only from the user and session that owns it.
const CONTINUATION_TTL_MS = 15 * 60_000
const pendingContinuations = new Map<
  string,
  { continuation: Continuation; session: ChatSession; expiresAt: number }
>()

function keepContinuation(continuation: Continuation, session: ChatSession) {
  const now = Date.now()
  for (const [id, entry] of pendingContinuations) {
    if (entry.expiresAt <= now) pendingContinuations.delete(id)
  }
  pendingContinuations.set(continuation.interaction.id, {
    continuation,
    session,
    expiresAt: now + CONTINUATION_TTL_MS,
  })
}

function claimContinuation(interactionId: string, session: ChatSession) {
  const entry = pendingContinuations.get(interactionId)
  if (
    !entry ||
    entry.expiresAt <= Date.now() ||
    entry.session.userId !== session.userId ||
    entry.session.sessionId !== session.sessionId
  ) {
    throw new Error('Approval request expired or not found')
  }
  pendingContinuations.delete(interactionId)
  return entry.continuation
}

async function createChatAgent(session: ChatSession) {
  const [mcp, sandbox] = await Promise.all([
    getMcpConnection(),
    getSandboxToolset(session.userId, session.sessionId),
  ])
  return createAgent({
    sandbox,
    memory: { store: memoryStore, savePolicy: 'turn' },
    mcpServers: mcp.servers,
  })
}

async function* streamAgentEvents(prompt: string, session: ChatSession, abortSignal?: AbortSignal) {
  const agent = await createChatAgent(session)
  for await (const event of agent.stream({ prompt, session, abortSignal })) {
    if (event.type === 'interaction') keepContinuation(event.continuation, session)
    yield event
  }
}

async function* resumeAgentEvents(
  interactionId: string,
  response: { type: 'tool-approval'; approved: boolean; reason?: string },
  session: ChatSession,
  abortSignal?: AbortSignal,
) {
  const continuation = claimContinuation(interactionId, session)
  const agent = await createChatAgent(session)
  const outcome = await agent.resume(continuation, response, { abortSignal })
  if (outcome.type === 'interaction') keepContinuation(outcome.continuation, session)
  // `resume` returns only the final outcome, so surface its text the way streamed text arrives.
  if (outcome.type === 'response' && outcome.text) {
    yield { type: 'text_delta' as const, turn: 1, delta: outcome.text }
  }
  yield outcome
}

export function streamChat(
  input:
    | { type: 'messages'; prompt: string }
    | {
        type: 'interaction_response'
        interactionId: string
        response: { type: 'tool-approval'; approved: boolean; reason?: string }
      },
  session: ChatSession,
  abortSignal?: AbortSignal,
) {
  return agentToClientStream({
    events:
      input.type === 'messages'
        ? streamAgentEvents(input.prompt, session, abortSignal)
        : resumeAgentEvents(input.interactionId, input.response, session, abortSignal),
    mapError: (error) => {
      console.error('Chat stream failed', error instanceof Error ? error.name : 'UnknownError')
      return { message: 'The assistant could not complete this response.' }
    },
  })
}
