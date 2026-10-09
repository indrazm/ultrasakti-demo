import { agentToClientStream, type ClientStreamRequest } from '@anvia/client'
import { createAgent } from '@ultrasakti/runtime'

export function streamChat(body: Extract<ClientStreamRequest, { type: 'messages' }>) {
  const agent = createAgent()
  const messages = body.messages.map((message) => ({
    role: message.role as 'user' | 'assistant',
    content:
      typeof message.content === 'string'
        ? message.content
        : message.content
            .filter((part) => part.type === 'text')
            .map((part) => part.text)
            .join(''),
  }))
  return agentToClientStream({
    events: agent.stream({ messages }),
    mapError: (error) => {
      console.error('Chat stream failed', error instanceof Error ? error.name : 'UnknownError')
      return { message: 'The assistant could not complete this response.' }
    },
  })
}
