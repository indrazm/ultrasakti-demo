import { useState } from 'react'
import { createHttpClientTransport } from '@anvia/client'
import { useChat } from '@anvia/react'
import { ChatProvider, ComposerPrimitive, MessagePrimitive, ThreadPrimitive } from '@anvia/react-ui'
import { Menu, Sparkles } from 'lucide-react'
import { Button } from '@ultrasakti/ui/components/button'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@ultrasakti/ui/components/sheet'
import { ChatSidebar } from './chat-sidebar'

type ChatPageProps = {
  user: { name: string; email: string }
  onSignOut: () => void
  signOutPending: boolean
  signOutError: string
}

const transport = createHttpClientTransport({
  endpoint: `${import.meta.env.VITE_API_URL}/api/chat`,
  format: 'jsonl',
  init: { credentials: 'include' },
})

const suggestions = [
  ['Make a plan', 'for a project I have in mind'],
  ['Write something', 'clear, warm, and useful'],
  ['Explore ideas', 'for my next big thing'],
  ['Learn a concept', 'one step at a time'],
]

export function ChatPage({ user, onSignOut, signOutPending, signOutError }: ChatPageProps) {
  const chat = useChat({ transport })
  const [draft, setDraft] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const title = chat.messages
    .find((message) => message.role === 'user')
    ?.parts.filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('')

  function newChat() {
    chat.reset()
    setDraft('')
    setSidebarOpen(false)
  }

  return (
    <ChatProvider controller={chat}>
      <main className="flex h-dvh min-h-[420px] overflow-hidden bg-[#f8f8f6] text-[#242725]">
        <aside
          aria-label="Chat sidebar"
          className="hidden w-[272px] shrink-0 border-r border-[#e9e9e5] lg:block"
        >
          <ChatSidebar user={user} title={title} onNewChat={newChat} />
        </aside>
        <section className="flex min-w-0 flex-1 flex-col bg-[#fcfcfb]">
          <header className="flex h-[72px] shrink-0 items-center justify-between border-b border-[#f0f0ec] px-5 lg:px-9">
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
                  <ChatSidebar user={user} title={title} onNewChat={newChat} />
                </SheetContent>
              </Sheet>
              <h1 className="truncate text-sm font-semibold text-[#464b46]">
                {title || 'New chat'}
              </h1>
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
          <ThreadPrimitive.Root className="flex min-h-0 flex-1 flex-col">
            <ThreadPrimitive.Viewport
              autoScroll={chat.messages.length > 0}
              className="min-h-0 flex-1 overflow-y-auto px-5 py-8 lg:px-12"
            >
              <div className="mx-auto w-full max-w-[760px]">
                <ThreadPrimitive.Empty className="flex min-h-[50vh] flex-col items-center justify-center pb-10 text-center">
                  <span className="mb-6 flex size-14 items-center justify-center rounded-2xl bg-[#dce9dd] text-[#477452]">
                    <Sparkles size={27} />
                  </span>
                  <h2 className="text-3xl font-semibold sm:text-4xl">What can I help you with?</h2>
                  <p className="mt-3 text-[#8a908b]">A quiet place to think, write, and explore.</p>
                  <div className="mt-10 grid w-full max-w-[580px] grid-cols-1 gap-3 text-left sm:grid-cols-2">
                    {suggestions.map(([heading, detail]) => (
                      <button
                        key={heading}
                        className="rounded-2xl border border-[#e8eae5] bg-white px-5 py-4 text-left hover:border-[#bbd0be] hover:bg-[#f8faf7]"
                        onClick={() => setDraft(`${heading} ${detail}`)}
                      >
                        <span className="block text-sm font-semibold">{heading}</span>
                        <span className="mt-1 block text-sm text-[#8a908b]">{detail}</span>
                      </button>
                    ))}
                  </div>
                </ThreadPrimitive.Empty>
                <ThreadPrimitive.Messages className="space-y-8 pb-6">
                  {(message) => (
                    <MessagePrimitive.Root
                      key={message.id}
                      className={message.role === 'user' ? 'flex justify-end' : 'flex gap-3'}
                    >
                      {message.role === 'assistant' && (
                        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-[#dce9dd] text-[#477452]">
                          <Sparkles size={17} />
                        </span>
                      )}
                      <MessagePrimitive.Content
                        className={
                          message.role === 'user'
                            ? 'max-w-[80%] rounded-[20px] rounded-br-md bg-[#e9eee7] px-5 py-3.5 text-[15px] leading-6 text-[#303b32]'
                            : 'max-w-[650px] whitespace-pre-wrap pt-0.5 text-[15px] leading-[1.75] text-[#4d534e]'
                        }
                      >
                        {message.role === 'assistant' && (
                          <p className="mb-2 text-sm font-semibold text-[#242725]">Atelier</p>
                        )}
                        <MessagePrimitive.Parts filter={(part) => part.type === 'text'} />
                      </MessagePrimitive.Content>
                    </MessagePrimitive.Root>
                  )}
                </ThreadPrimitive.Messages>
                <ThreadPrimitive.Loading role="status" className="text-sm text-[#8a908b]">
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
                className="mx-auto max-w-[760px] rounded-[22px] border border-[#e5e9e2] bg-white p-3 shadow-[0_10px_35px_rgba(42,55,43,0.05)] focus-within:border-[#a9c4ad]"
              >
                <ComposerPrimitive.TextareaInput
                  aria-label="Message Atelier"
                  placeholder="Message Atelier..."
                  rows={2}
                  className="max-h-40 min-h-[70px] w-full resize-none border-0 px-2 py-2 text-[15px] outline-none"
                />
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs text-[#a1a6a0]">Messages are not saved.</span>
                  {chat.status === 'streaming' || chat.status === 'submitted' ? (
                    <ComposerPrimitive.Stop className="rounded-xl bg-[#42734d] px-3 py-2 text-sm text-white">
                      Stop
                    </ComposerPrimitive.Stop>
                  ) : (
                    <ComposerPrimitive.Submit
                      aria-label="Send message"
                      className="rounded-xl bg-[#42734d] px-3 py-2 text-sm text-white disabled:opacity-50"
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
