export type ChatSession = {
  sessionId: string
  title: string
  createdAt: string
  updatedAt: string
}

export type SessionPage = {
  sessions: ChatSession[]
  nextOffset: number | null
}
export type SessionNavigation = {
  activeSessionId: string | null
  navigateToSession: (sessionId: string | null) => Promise<void>
}
