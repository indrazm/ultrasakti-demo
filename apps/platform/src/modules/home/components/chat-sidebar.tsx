import { MessageSquare, Plus, Sparkles } from 'lucide-react'
import { Avatar, AvatarFallback } from '@ultrasakti/ui/components/avatar'
import { Button } from '@ultrasakti/ui/components/button'
import type { ChatSession } from '../types'

type ChatSidebarProps = {
  user: { name: string; email: string }
  sessions: ChatSession[]
  activeSessionId: string | null
  activeTitle?: string
  onSelectSession: (sessionId: string) => void
  disabled: boolean
  loading: boolean
  error: boolean
  onRetry: () => void
  hasMore: boolean
  loadingMore: boolean
  onLoadMore: () => void
  onNewChat: () => void
}

export function ChatSidebar({
  user,
  sessions,
  activeSessionId,
  activeTitle,
  onNewChat,
  onSelectSession,
  disabled,
  loading,
  error,
  onRetry,
  hasMore,
  loadingMore,
  onLoadMore,
}: ChatSidebarProps) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-[#f3f3f0] text-[#242725]">
      <div className="flex items-center gap-2.5 px-5 pb-5 pt-5">
        <span className="flex size-8 items-center justify-center rounded-xl bg-[#d7e6d7] text-[#356747]">
          <Sparkles size={17} />
        </span>
        <span className="text-[17px] font-semibold tracking-tight">atelier</span>
      </div>
      <div className="px-3">
        <Button
          variant="ghost"
          className="h-10 w-full justify-start gap-3 px-3 hover:bg-[#e9eae5]"
          onClick={onNewChat}
          disabled={disabled}
        >
          <Plus size={18} /> New chat
        </Button>
      </div>
      <nav aria-label="Conversations" className="mt-9 min-h-0 flex-1 overflow-y-auto px-3">
        <p className="px-3 pb-2 text-xs font-semibold text-[#8b908b]">Conversations</p>
        {loading && (
          <p role="status" className="px-3 py-2 text-sm">
            Loading conversations…
          </p>
        )}
        {error && (
          <div role="alert" className="px-3 py-2 text-sm">
            Could not load conversations.{' '}
            <button onClick={onRetry} className="underline">
              Retry
            </button>
          </div>
        )}
        {!loading && !error && sessions.length === 0 && (
          <p className="px-3 py-2 text-sm text-[#8b908b]">No conversations yet</p>
        )}
        {sessions.map((session) => (
          <button
            key={session.sessionId}
            aria-current={session.sessionId === activeSessionId ? 'page' : undefined}
            disabled={disabled}
            onClick={() => onSelectSession(session.sessionId)}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-[#e9eae5] disabled:opacity-60 ${session.sessionId === activeSessionId ? 'bg-[#e5e9e1]' : ''}`}
          >
            <MessageSquare size={16} className="shrink-0" />
            <span className="truncate">
              {session.sessionId === activeSessionId && activeTitle ? activeTitle : session.title}
            </span>
          </button>
        ))}
        {hasMore && (
          <Button variant="ghost" className="w-full" disabled={loadingMore} onClick={onLoadMore}>
            Load more
          </Button>
        )}
      </nav>
      <div className="border-t border-[#e6e7e2] p-3">
        <div className="flex items-center gap-3 rounded-xl px-2 py-2">
          <Avatar className="size-9">
            <AvatarFallback className="bg-[#e5ddd1] text-xs font-semibold text-[#6d5d4a]">
              {user.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-semibold">{user.name}</p>
            <p className="max-w-[180px] truncate text-xs text-[#888e88]">{user.email}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
