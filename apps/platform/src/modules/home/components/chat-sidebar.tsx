import { Asterisk, Plus } from 'lucide-react'
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
    <div className="flex h-full min-h-0 flex-col bg-[#f5f4ed] text-[#141413]">
      <div className="flex h-12 items-center gap-2 px-5 pt-2">
        <Asterisk size={22} strokeWidth={2.5} className="text-[#d97757]" />
        <span className="font-[ui-serif,Georgia,Cambria,'Times_New_Roman',serif] text-[22px] tracking-tight">
          atelier
        </span>
      </div>
      <div className="mt-3 px-2">
        <button
          type="button"
          className="flex h-9 w-full items-center gap-2.5 rounded-lg px-3 text-sm font-medium hover:bg-[#1f1e1d]/5 disabled:opacity-60"
          onClick={onNewChat}
          disabled={disabled}
        >
          <span className="flex size-6 items-center justify-center rounded-full bg-[#c96442] text-white">
            <Plus size={15} strokeWidth={2.5} />
          </span>
          New chat
        </button>
      </div>
      <nav aria-label="Conversations" className="mt-5 min-h-0 flex-1 overflow-y-auto px-2">
        <p className="px-3 pb-1.5 text-xs font-medium text-[#73726c]">Conversations</p>
        {loading && (
          <p role="status" className="px-3 py-2 text-sm text-[#73726c]">
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
          <p className="px-3 py-2 text-sm text-[#73726c]">No conversations yet</p>
        )}
        {sessions.map((session) => (
          <button
            key={session.sessionId}
            aria-current={session.sessionId === activeSessionId ? 'page' : undefined}
            disabled={disabled}
            onClick={() => onSelectSession(session.sessionId)}
            className="flex h-9 w-full items-center rounded-lg px-3 text-left text-sm text-[#3d3d3a] hover:bg-[#1f1e1d]/5 disabled:opacity-60 aria-[current=page]:bg-[#1f1e1d]/[0.07] aria-[current=page]:text-[#141413]"
          >
            <span className="truncate">
              {session.sessionId === activeSessionId && activeTitle ? activeTitle : session.title}
            </span>
          </button>
        ))}
        {hasMore && (
          <Button
            variant="ghost"
            className="w-full text-[#73726c] hover:bg-[#1f1e1d]/5"
            disabled={loadingMore}
            onClick={onLoadMore}
          >
            Load more
          </Button>
        )}
      </nav>
      <div className="border-t border-[#1f1e1d]/10 p-2">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <Avatar className="size-8">
            <AvatarFallback className="bg-[#141413] text-xs font-medium text-white">
              {user.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="max-w-[180px] truncate text-xs text-[#73726c]">{user.email}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
