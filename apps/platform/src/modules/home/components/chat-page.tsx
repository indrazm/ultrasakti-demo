import { useEffect, useState } from 'react'
import { ChatProvider, ComposerPrimitive, MessagePrimitive, ThreadPrimitive } from '@anvia/react-ui'
import { ArrowUp, Asterisk, PanelLeft, Square } from 'lucide-react'
import { Button } from '@ultrasakti/ui/components/button'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@ultrasakti/ui/components/sheet'
import { ChatSidebar } from './chat-sidebar'
import { useSessionChat } from '../hooks/use-session-chat'
import type { SessionNavigation } from '../types'

type ChatPageProps = SessionNavigation & {
  user: { id: string; name: string; email: string }
  onSignOut: () => void
  signOutPending: boolean
  signOutError: string
}

const suggestions = [
  ['Make a plan', 'for a project I have in mind'],
  ['Write something', 'clear, warm, and useful'],
  ['Explore ideas', 'for my next big thing'],
  ['Learn a concept', 'one step at a time'],
]

export function ChatPage({
  user,
  onSignOut,
  signOutPending,
  signOutError,
  ...navigation
}: ChatPageProps) {
  const sessionChat = useSessionChat(user.id, navigation)
  const { chat, sessions, activeSessionId, loadingHistory, historyError, busy } = sessionChat
  const [draft, setDraft] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  useEffect(() => {
    setDraft('')
    setSidebarOpen(false)
  }, [activeSessionId])
  const title = activeSessionId
    ? chat.messages
        .find((message) => message.role === 'user')
        ?.parts.filter((part) => part.type === 'text')
        .map((part) => part.text)
        .join('')
    : undefined

  function newChat() {
    sessionChat.newChat()
    setDraft('')
    setSidebarOpen(false)
  }

  function selectSession(sessionId: string) {
    setDraft('')
    setSidebarOpen(false)
    void sessionChat.selectSession(sessionId)
  }

  const sidebar = (
    <ChatSidebar
      user={user}
      sessions={sessions.data?.pages.flatMap((page) => page.sessions) ?? []}
      activeSessionId={activeSessionId}
      activeTitle={title}
      onNewChat={newChat}
      onSelectSession={selectSession}
      disabled={busy}
      loading={sessions.isPending}
      error={sessions.isError}
      onRetry={() => void sessions.refetch()}
      hasMore={sessions.hasNextPage}
      loadingMore={sessions.isFetchingNextPage}
      onLoadMore={() => void sessions.fetchNextPage()}
    />
  )

  const empty = !activeSessionId
  const serif = "font-[ui-serif,Georgia,Cambria,'Times_New_Roman',serif]"

  return (
    <ChatProvider controller={chat}>
      <main className="flex h-dvh min-h-[420px] overflow-hidden bg-[#faf9f5] text-[#141413]">
        <aside
          aria-label="Chat sidebar"
          className="hidden w-[288px] shrink-0 border-r border-[#1f1e1d]/10 lg:block"
        >
          {sidebar}
        </aside>
        <section className="relative flex min-w-0 flex-1 flex-col bg-[#faf9f5]">
          <header className="flex h-12 shrink-0 items-center justify-between px-4">
            <div className="flex min-w-0 items-center gap-2">
              <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                <SheetTrigger
                  aria-label="Open sidebar"
                  render={
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-[#73726c] hover:bg-[#1f1e1d]/5 lg:hidden"
                    />
                  }
                >
                  <PanelLeft size={19} />
                </SheetTrigger>
                <SheetContent side="left" className="gap-0 p-0 [&]:w-[288px] lg:hidden">
                  <SheetTitle className="sr-only">Chats</SheetTitle>
                  {sidebar}
                </SheetContent>
              </Sheet>
              <h1 className="truncate rounded-lg px-2 py-1 text-sm font-medium text-[#141413]">
                {title || 'New chat'}
              </h1>
            </div>
            <div className="flex items-center gap-3">
              {signOutError && (
                <p role="alert" className="text-xs text-destructive">
                  {signOutError}
                </p>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="text-[#73726c] hover:bg-[#1f1e1d]/5 hover:text-[#141413]"
                onClick={onSignOut}
                disabled={signOutPending}
              >
                Sign out
              </Button>
            </div>
          </header>
          {historyError && (
            <div role="alert" className="px-5 py-3 text-sm text-destructive">
              {historyError}
              <Button variant="ghost" size="sm" onClick={sessionChat.retryHistory}>
                Retry
              </Button>
            </div>
          )}
          <ThreadPrimitive.Root
            role="region"
            aria-label="Conversation"
            aria-busy={loadingHistory}
            className={`flex min-h-0 flex-1 flex-col ${empty ? 'justify-center pb-[8vh]' : ''}`}
          >
            <ThreadPrimitive.Viewport
              autoScroll={chat.messages.length > 0}
              className={`px-4 lg:px-8 ${empty ? 'flex-none' : 'min-h-0 flex-1 overflow-y-auto py-6'}`}
            >
              <div className="mx-auto w-full max-w-[720px]">
                {empty && (
                  <div className="mb-8 flex items-center justify-center gap-3 text-center sm:mb-10">
                    <Asterisk size={40} strokeWidth={2.5} className="shrink-0 text-[#d97757]" />
                    <h2 className={`${serif} text-3xl font-normal text-[#3d3d3a] sm:text-[40px]`}>
                      What can I help you with?
                    </h2>
                  </div>
                )}
                {activeSessionId && !loadingHistory && (
                  <ThreadPrimitive.Messages className="space-y-6 pb-6">
                    {(message) => (
                      <MessagePrimitive.Root
                        key={message.id}
                        className={message.role === 'user' ? 'flex justify-end' : 'flex flex-col'}
                      >
                        <MessagePrimitive.Content
                          className={
                            message.role === 'user'
                              ? 'max-w-[80%] whitespace-pre-wrap rounded-2xl bg-[#f0eee6] px-4 py-2.5 text-base leading-6 text-[#141413]'
                              : 'max-w-full whitespace-pre-wrap px-1 text-base leading-[1.7] text-[#141413]'
                          }
                        >
                          {message.role === 'assistant' && <p className="sr-only">Atelier</p>}
                          <MessagePrimitive.Parts filter={(part) => part.type === 'text'} />
                        </MessagePrimitive.Content>
                        {message.role === 'assistant' && (
                          <Asterisk
                            size={22}
                            strokeWidth={2.5}
                            aria-hidden
                            className="ml-1 mt-4 text-[#d97757]"
                          />
                        )}
                      </MessagePrimitive.Root>
                    )}
                  </ThreadPrimitive.Messages>
                )}
                <ThreadPrimitive.Loading role="status" className="px-1 text-sm text-[#73726c]">
                  Atelier is thinking…
                </ThreadPrimitive.Loading>
                <ThreadPrimitive.Error role="alert" className="px-1 text-sm text-destructive">
                  Could not get a response. Please try again.
                </ThreadPrimitive.Error>
              </div>
            </ThreadPrimitive.Viewport>
            <div className={`shrink-0 px-4 lg:px-8 ${empty ? '' : 'pb-4 pt-2'}`}>
              <ComposerPrimitive.Root
                input={draft}
                onInputChange={setDraft}
                className="mx-auto max-w-[720px] rounded-[20px] border border-[#1f1e1d]/15 bg-white p-3 shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-shadow focus-within:shadow-[0_6px_28px_rgba(0,0,0,0.08)] hover:shadow-[0_6px_28px_rgba(0,0,0,0.07)]"
              >
                <ComposerPrimitive.TextareaInput
                  aria-label="Message Atelier"
                  placeholder={empty ? 'How can I help you today?' : 'Reply to Atelier...'}
                  rows={2}
                  disabled={loadingHistory || Boolean(historyError)}
                  className="max-h-48 min-h-[52px] w-full resize-none border-0 bg-transparent px-2 py-1 text-base text-[#141413] outline-none placeholder:text-[#73726c]"
                />
                <div className="flex items-center justify-end">
                  {chat.status === 'streaming' || chat.status === 'submitted' ? (
                    <ComposerPrimitive.Stop className="flex size-8 items-center justify-center rounded-lg bg-[#c96442] text-white hover:bg-[#b5573a]">
                      <Square size={13} fill="currentColor" aria-hidden />
                      <span className="sr-only">Stop</span>
                    </ComposerPrimitive.Stop>
                  ) : (
                    <ComposerPrimitive.Submit
                      aria-label="Send message"
                      disabled={loadingHistory || Boolean(historyError)}
                      className="flex size-8 items-center justify-center rounded-lg bg-[#c96442] text-white hover:bg-[#b5573a] disabled:opacity-40"
                    >
                      <ArrowUp size={18} aria-hidden />
                      <span className="sr-only">Send</span>
                    </ComposerPrimitive.Submit>
                  )}
                </div>
              </ComposerPrimitive.Root>
              <p className="mx-auto mt-2 max-w-[720px] text-center text-xs text-[#73726c]">
                Conversations are saved to your account.
              </p>
            </div>
            {empty && (
              <div className="mx-auto mt-4 flex max-w-[720px] flex-wrap justify-center gap-2 px-4">
                {suggestions.map(([heading, detail]) => (
                  <button
                    key={heading}
                    className="rounded-full border border-[#1f1e1d]/15 bg-transparent px-4 py-1.5 text-sm text-[#3d3d3a] hover:bg-[#1f1e1d]/5"
                    onClick={() => setDraft(`${heading} ${detail}`)}
                  >
                    {heading}
                  </button>
                ))}
              </div>
            )}
          </ThreadPrimitive.Root>
        </section>
      </main>
    </ChatProvider>
  )
}
