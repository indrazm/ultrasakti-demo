import { useEffect, useState } from 'react'
import { ChatProvider, ComposerPrimitive, MessagePrimitive, ThreadPrimitive } from '@anvia/react-ui'
import { Menu, Sparkles } from 'lucide-react'
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

  return (
    <ChatProvider controller={chat}>
      <main className="flex h-dvh min-h-[420px] overflow-hidden bg-[#faf9f5] text-[#141413]">
        <aside
          aria-label="Chat sidebar"
          className="hidden w-[272px] shrink-0 border-r border-[#e8e6dc] lg:block"
        >
          {sidebar}
        </aside>
        <section className="flex min-w-0 flex-1 flex-col bg-[#faf9f5]">
          <header className="flex h-14 shrink-0 items-center justify-between px-5 lg:px-9">
            <div className="flex min-w-0 items-center gap-3">
              <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                <SheetTrigger
                  aria-label="Open sidebar"
                  render={<Button variant="ghost" size="icon" className="-ml-2 lg:hidden" />}
                >
                  <Menu size={19} />
                </SheetTrigger>
                <SheetContent side="left" className="gap-0 p-0 [&]:w-[272px] lg:hidden">
                  <SheetTitle className="sr-only">Chats</SheetTitle>
                  {sidebar}
                </SheetContent>
              </Sheet>
              <h1 className="truncate text-sm font-medium text-[#3d3d3a]">{title || 'New chat'}</h1>
            </div>
            <div className="flex items-center gap-3">
              {signOutError && (
                <p role="alert" className="text-xs text-destructive">
                  {signOutError}
                </p>
              )}
              <Button variant="outline" size="sm" onClick={onSignOut} disabled={signOutPending}>
                Sign out
              </Button>
            </div>
          </header>
          {loadingHistory && (
            <p role="status" className="px-5 py-3 text-sm">
              Loading conversation…
            </p>
          )}
          {historyError && (
            <div role="alert" className="px-5 py-3 text-sm text-destructive">
              {historyError}
              <Button variant="ghost" size="sm" onClick={sessionChat.retryHistory}>
                Retry
              </Button>
            </div>
          )}
          <ThreadPrimitive.Root className="flex min-h-0 flex-1 flex-col">
            <ThreadPrimitive.Viewport
              autoScroll={chat.messages.length > 0}
              className="min-h-0 flex-1 overflow-y-auto px-5 py-8 lg:px-12"
            >
              <div className="mx-auto w-full max-w-[760px]">
                {!activeSessionId && (
                  <div className="flex min-h-[50vh] flex-col items-center justify-center pb-10 text-center">
                    <span className="mb-6 flex size-14 items-center justify-center text-[#d97757]">
                      <Sparkles size={27} />
                    </span>
                    <h2 className="font-[ui-serif,Georgia,Cambria,'Times_New_Roman',serif] text-3xl font-normal sm:text-4xl">
                      What can I help you with?
                    </h2>
                    <p className="mt-3 text-[#73726c]">
                      A quiet place to think, write, and explore.
                    </p>
                    <div className="mt-10 grid w-full max-w-[580px] grid-cols-1 gap-3 text-left sm:grid-cols-2">
                      {suggestions.map(([heading, detail]) => (
                        <button
                          key={heading}
                          className="rounded-2xl border border-[#e8e6dc] bg-white px-5 py-4 text-left hover:border-[#d1cfc5] hover:bg-[#f5f4ee]"
                          onClick={() => setDraft(`${heading} ${detail}`)}
                        >
                          <span className="block text-sm font-semibold">{heading}</span>
                          <span className="mt-1 block text-sm text-[#73726c]">{detail}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {activeSessionId && !loadingHistory && (
                  <ThreadPrimitive.Messages className="space-y-8 pb-6">
                    {(message) => (
                      <MessagePrimitive.Root
                        key={message.id}
                        className={message.role === 'user' ? 'flex justify-end' : 'flex gap-3'}
                      >
                        {message.role === 'assistant' && (
                          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center text-[#d97757]">
                            <Sparkles size={17} />
                          </span>
                        )}
                        <MessagePrimitive.Content
                          className={
                            message.role === 'user'
                              ? 'max-w-[80%] rounded-2xl bg-[#f0eee6] px-4 py-3 text-[15px] leading-6 text-[#141413]'
                              : 'max-w-[650px] whitespace-pre-wrap pt-0.5 text-[15px] leading-[1.75] text-[#141413]'
                          }
                        >
                          {message.role === 'assistant' && (
                            <p className="mb-2 text-sm font-medium text-[#141413]">Atelier</p>
                          )}
                          <MessagePrimitive.Parts filter={(part) => part.type === 'text'} />
                        </MessagePrimitive.Content>
                      </MessagePrimitive.Root>
                    )}
                  </ThreadPrimitive.Messages>
                )}
                <ThreadPrimitive.Loading role="status" className="text-sm text-[#73726c]">
                  Atelier is thinking…
                </ThreadPrimitive.Loading>
                <ThreadPrimitive.Error role="alert" className="text-sm text-destructive">
                  Could not get a response. Please try again.
                </ThreadPrimitive.Error>
              </div>
            </ThreadPrimitive.Viewport>
            <div className="shrink-0 px-4 pb-5 pt-2 lg:px-12 lg:pb-7">
              <ComposerPrimitive.Root
                input={draft}
                onInputChange={setDraft}
                className="mx-auto max-w-[760px] rounded-3xl border border-[#e0ded3] bg-white p-3 shadow-[0_4px_24px_rgba(20,20,19,0.05)] focus-within:border-[#c6c3b6]"
              >
                <ComposerPrimitive.TextareaInput
                  aria-label="Message Atelier"
                  placeholder="Message Atelier..."
                  rows={2}
                  disabled={loadingHistory || Boolean(historyError)}
                  className="max-h-40 min-h-[70px] w-full resize-none border-0 px-2 py-2 text-[15px] outline-none"
                />
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs text-[#8a8880]">
                    Conversations are saved to your account.
                  </span>
                  {chat.status === 'streaming' || chat.status === 'submitted' ? (
                    <ComposerPrimitive.Stop className="rounded-xl bg-[#c96442] px-3 py-2 text-sm text-white hover:bg-[#b5573a]">
                      Stop
                    </ComposerPrimitive.Stop>
                  ) : (
                    <ComposerPrimitive.Submit
                      aria-label="Send message"
                      disabled={loadingHistory || Boolean(historyError)}
                      className="rounded-xl bg-[#c96442] px-3 py-2 text-sm text-white hover:bg-[#b5573a] disabled:opacity-50"
                    >
                      Send
                    </ComposerPrimitive.Submit>
                  )}
                </div>
              </ComposerPrimitive.Root>
            </div>
          </ThreadPrimitive.Root>
        </section>
      </main>
    </ChatProvider>
  )
}
