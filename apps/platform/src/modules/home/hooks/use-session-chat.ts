import { useEffect, useMemo, useRef, useState } from 'react'
import { createHttpClientTransport, type ClientTransport } from '@anvia/client'
import { useChat } from '@anvia/react'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { createSession, listSessions, loadSession } from '../api/sessions'
import type { SessionNavigation } from '../types'

const httpTransport = createHttpClientTransport({
  endpoint: `${import.meta.env.VITE_API_URL}/api/chat`,
  format: 'jsonl',
  init: { credentials: 'include' },
})

export function useSessionChat(
  userId: string,
  { activeSessionId, navigateToSession }: SessionNavigation,
) {
  const queryClient = useQueryClient()
  const sessionIdRef = useRef(activeSessionId)
  const createdSessionRef = useRef<string | null>(null)
  const [loadedSessionId, setLoadedSessionId] = useState<string | null>(null)
  const [historyAttempt, setHistoryAttempt] = useState(0)
  const [historyError, setHistoryError] = useState('')
  const sessions = useInfiniteQuery({
    queryKey: ['sessions', userId],
    queryFn: ({ pageParam, signal }) => listSessions(pageParam, signal),
    initialPageParam: 0,
    getNextPageParam: (page) => page.nextOffset,
  })

  const transport = useMemo<ClientTransport>(
    () => ({
      async *send(options) {
        if (options.request.type === 'interaction_response') {
          const sessionId = sessionIdRef.current
          if (!sessionId) throw new Error('A session is required')
          const { interactionId, response } = options.request
          yield* httpTransport.send({
            ...options,
            request: {
              type: 'interaction_response',
              interactionId,
              response,
              metadata: { sessionId },
            },
          })
          void queryClient.invalidateQueries({ queryKey: ['session', userId, sessionId] })
          return
        }
        const lastMessage = options.request.messages.at(-1)
        if (!lastMessage || lastMessage.role !== 'user') throw new Error('A message is required')
        options.abortSignal?.throwIfAborted()
        let sessionId = sessionIdRef.current
        if (!sessionId) {
          const session = await createSession(options.abortSignal)
          options.abortSignal?.throwIfAborted()
          sessionId = session.sessionId
          sessionIdRef.current = sessionId
          createdSessionRef.current = sessionId
          setLoadedSessionId(sessionId)
          await navigateToSession(sessionId)
          options.abortSignal?.throwIfAborted()
        }
        try {
          yield* httpTransport.send({
            ...options,
            request: {
              type: 'messages',
              messages: [
                {
                  role: 'user',
                  content:
                    typeof lastMessage.content === 'string'
                      ? lastMessage.content
                      : lastMessage.content
                          .filter((part) => part.type === 'text')
                          .map((part) => part.text)
                          .join(''),
                },
              ],
              metadata: { sessionId },
            },
          })
        } finally {
          void queryClient.invalidateQueries({ queryKey: ['sessions', userId] })
          void queryClient.invalidateQueries({ queryKey: ['session', userId, sessionId] })
        }
      },
    }),
    [queryClient, userId, navigateToSession],
  )

  const chat = useChat({ transport })
  const { reset, setMessages } = chat
  const loadingHistory = activeSessionId !== null && loadedSessionId !== activeSessionId
  const busy = loadingHistory || chat.status === 'submitted' || chat.status === 'streaming'

  useEffect(() => {
    // The first send already owns this controller; navigation must not reset its stream.
    if (activeSessionId && createdSessionRef.current === activeSessionId) {
      createdSessionRef.current = null
      return
    }
    let current = true
    reset()
    sessionIdRef.current = activeSessionId
    setLoadedSessionId(null)
    setHistoryError('')
    if (!activeSessionId) return
    void queryClient
      .fetchQuery({
        queryKey: ['session', userId, activeSessionId],
        queryFn: ({ signal }) => loadSession(activeSessionId, signal),
        staleTime: 0,
      })
      .then((messages) => {
        if (current) setMessages(messages)
      })
      .catch(() => {
        if (current) setHistoryError('Could not load this conversation. Please try again.')
      })
      .finally(() => {
        if (current) setLoadedSessionId(activeSessionId)
      })
    return () => {
      current = false
    }
  }, [activeSessionId, historyAttempt, queryClient, userId, reset, setMessages])

  function newChat() {
    if (busy) return
    if (activeSessionId === null) {
      reset()
      sessionIdRef.current = null
      createdSessionRef.current = null
    }
    void navigateToSession(null)
  }

  function selectSession(sessionId: string) {
    if (busy) return
    void navigateToSession(sessionId)
  }

  return {
    chat,
    sessions,
    activeSessionId,
    loadingHistory,
    historyError,
    busy,
    newChat,
    selectSession,
    retryHistory: () => setHistoryAttempt((attempt) => attempt + 1),
  }
}
