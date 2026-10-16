import { parseUIMessages } from '@anvia/client'
import type { ChatSession, SessionPage } from '../types'

const endpoint = `${import.meta.env.VITE_API_URL}/api/sessions`

async function sessionRequest(path: string, init?: RequestInit) {
  const response = await fetch(`${endpoint}${path}`, { ...init, credentials: 'include' })
  if (!response.ok) throw new Error('Could not access your conversations. Please try again.')
  return response.json()
}

export function listSessions(offset: number, signal: AbortSignal): Promise<SessionPage> {
  return sessionRequest(`?offset=${offset}`, { signal })
}

export async function createSession(signal?: AbortSignal): Promise<ChatSession> {
  const data = await sessionRequest('', {
    method: 'POST',
    signal,
    headers: { 'content-type': 'application/json' },
    body: '{}',
  })
  return data.session
}

export async function loadSession(sessionId: string, signal: AbortSignal) {
  const data = await sessionRequest(`/${encodeURIComponent(sessionId)}`, { signal })
  return parseUIMessages(data.messages)
}
