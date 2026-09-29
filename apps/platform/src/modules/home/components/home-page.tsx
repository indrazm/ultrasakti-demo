import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ArrowUp, Menu, Sparkles } from 'lucide-react'
import { Bubble, BubbleContent } from '@ultrasakti/ui/components/bubble'
import { Button } from '@ultrasakti/ui/components/button'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@ultrasakti/ui/components/empty'
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageHeader,
} from '@ultrasakti/ui/components/message'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@ultrasakti/ui/components/sheet'
import { Textarea } from '@ultrasakti/ui/components/textarea'
import { ChatSidebar } from './chat-sidebar'

type ChatMessage = { id: number; role: 'assistant' | 'user'; content: string }
type Conversation = { id: number; title: string; messages: ChatMessage[] }

const initialConversations: Conversation[] = [
  {
    id: 1,
    title: 'Planning a product launch',
    messages: [
      {
        id: 1,
        role: 'user',
        content: 'Help me plan a thoughtful launch for our new workspace app.',
      },
      {
        id: 2,
        role: 'assistant',
        content:
          'Absolutely. A strong launch starts with a clear story: who the app is for, what changes for them, and why now. I’d organize the work into three phases: prepare, launch, and learn.',
      },
      { id: 3, role: 'user', content: 'What should we focus on in the first two weeks?' },
      {
        id: 4,
        role: 'assistant',
        content:
          'Start with the essentials. Define one primary audience, write a simple positioning statement, and choose the few channels where that audience already spends time. Then make a small list of early users who can give honest feedback before launch day.',
      },
    ],
  },
  {
    id: 2,
    title: 'Ideas for a team offsite',
    messages: [
      {
        id: 5,
        role: 'user',
        content: 'Can you suggest a few activities for a small team offsite?',
      },
      {
        id: 6,
        role: 'assistant',
        content:
          'Try a mix of reflection and play: a short retrospective, a collaborative cooking session, and an unstructured walk in pairs. Leave enough open time for conversations that do not fit on an agenda.',
      },
    ],
  },
  {
    id: 3,
    title: 'Writing a better brief',
    messages: [
      { id: 7, role: 'user', content: 'What makes a useful creative brief?' },
      {
        id: 8,
        role: 'assistant',
        content:
          'A useful brief gives the team a clear goal, audience, constraints, and definition of success. Keep it short enough that someone can understand the assignment in one reading.',
      },
    ],
  },
]

const suggestions = [
  ['Make a plan', 'for a project I have in mind'],
  ['Write something', 'clear, warm, and useful'],
  ['Explore ideas', 'for my next big thing'],
  ['Learn a concept', 'one step at a time'],
]

export function HomePage() {
  const [conversations, setConversations] = useState(initialConversations)
  const [activeId, setActiveId] = useState<number | null>(1)
  const [draft, setDraft] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [search, setSearch] = useState('')
  const nextId = useRef(9)
  const messagesViewport = useRef<HTMLDivElement>(null)
  const activeConversation = conversations.find((conversation) => conversation.id === activeId)
  const visibleConversations = conversations.filter((conversation) =>
    conversation.title.toLowerCase().includes(search.toLowerCase()),
  )

  useEffect(() => {
    if (messagesViewport.current) {
      messagesViewport.current.scrollTop = messagesViewport.current.scrollHeight
    }
  }, [activeId, activeConversation?.messages.length])

  function selectChat(id: number | null) {
    setActiveId(id)
    setDraft('')
    setSidebarOpen(false)
    setSearch('')
    setSearchOpen(false)
  }

  function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const content = draft.trim()
    if (!content) return

    const id = nextId.current++
    const message: ChatMessage = { id, role: 'user', content }
    if (activeConversation) {
      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === activeId
            ? { ...conversation, messages: [...conversation.messages, message] }
            : conversation,
        ),
      )
    } else {
      setConversations((current) => [{ id, title: content, messages: [message] }, ...current])
      setActiveId(id)
    }
    setDraft('')
  }

  return (
    <main className="flex h-dvh min-h-[420px] overflow-hidden bg-[#f8f8f6] text-[#242725]">
      <aside
        aria-label="Chat sidebar"
        className="hidden w-[272px] shrink-0 border-r border-[#e9e9e5] lg:block"
      >
        <ChatSidebar
          conversations={visibleConversations}
          activeId={activeId}
          searchOpen={searchOpen}
          search={search}
          onSearchOpenChange={setSearchOpen}
          onSearchChange={setSearch}
          onSelect={selectChat}
        />
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
                <ChatSidebar
                  conversations={visibleConversations}
                  activeId={activeId}
                  searchOpen={searchOpen}
                  search={search}
                  onSearchOpenChange={setSearchOpen}
                  onSearchChange={setSearch}
                  onSelect={selectChat}
                />
              </SheetContent>
            </Sheet>
            <h1 className="truncate text-sm font-semibold text-[#464b46]">
              {activeConversation?.title ?? 'New chat'}
            </h1>
          </div>
          <span className="hidden items-center gap-1.5 rounded-full border border-[#e8ebe5] bg-white px-3 py-1.5 text-xs font-medium text-[#66806c] sm:inline-flex">
            <span className="size-1.5 rounded-full bg-[#83ad8d]" /> Mock workspace
          </span>
        </header>

        <div ref={messagesViewport} className="min-h-0 flex-1 overflow-y-auto px-5 py-8 lg:px-12">
          <div className="mx-auto flex min-h-full w-full max-w-[760px] flex-col">
            {activeConversation ? (
              <div className="space-y-8 pb-6">
                <div className="mb-9 text-center">
                  <span className="rounded-full border border-[#e9ebe6] bg-[#f7f8f5] px-3 py-1 text-[11px] font-medium tracking-wide text-[#8b918b]">
                    TODAY
                  </span>
                </div>
                {activeConversation.messages.map((message) =>
                  message.role === 'user' ? (
                    <Message key={message.id} align="end">
                      <MessageContent>
                        <Bubble align="end" variant="secondary" className="max-w-[80%]">
                          <BubbleContent className="rounded-[20px] rounded-br-md bg-[#e9eee7] px-5 py-3.5 text-[15px] leading-6 text-[#303b32]">
                            {message.content}
                          </BubbleContent>
                        </Bubble>
                      </MessageContent>
                    </Message>
                  ) : (
                    <Message key={message.id}>
                      <MessageAvatar className="mt-0.5 size-8 self-start rounded-xl bg-[#dce9dd] text-[#477452]">
                        <Sparkles size={17} />
                      </MessageAvatar>
                      <MessageContent className="max-w-[650px] gap-2 pt-0.5">
                        <MessageHeader className="px-0 text-sm font-semibold text-[#242725]">
                          Atelier
                        </MessageHeader>
                        <Bubble variant="ghost">
                          <BubbleContent className="whitespace-pre-wrap text-[15px] leading-[1.75] text-[#4d534e]">
                            {message.content}
                          </BubbleContent>
                        </Bubble>
                      </MessageContent>
                    </Message>
                  ),
                )}
              </div>
            ) : (
              <Empty className="pb-10">
                <EmptyHeader className="gap-3">
                  <EmptyMedia className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-[#dce9dd] text-[#477452]">
                    <Sparkles size={27} />
                  </EmptyMedia>
                  <EmptyTitle className="text-3xl font-semibold sm:text-4xl">
                    <h2>What can I help you with?</h2>
                  </EmptyTitle>
                  <EmptyDescription className="text-[#8a908b]">
                    A quiet place to think, write, and explore.
                  </EmptyDescription>
                </EmptyHeader>
                <div className="mt-10 grid w-full max-w-[580px] grid-cols-1 gap-3 text-left sm:grid-cols-2">
                  {suggestions.map(([title, detail]) => (
                    <button
                      key={title}
                      className="rounded-2xl border border-[#e8eae5] bg-white px-5 py-4 text-left transition-colors hover:border-[#bbd0be] hover:bg-[#f8faf7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7b9d82]"
                      onClick={() => setDraft(`${title} ${detail}`)}
                    >
                      <span className="block text-sm font-semibold">{title}</span>
                      <span className="mt-1 block text-sm text-[#8a908b]">{detail}</span>
                    </button>
                  ))}
                </div>
              </Empty>
            )}
          </div>
        </div>

        <div className="shrink-0 px-4 pb-5 pt-2 lg:px-12 lg:pb-7">
          <form
            onSubmit={sendMessage}
            className="mx-auto max-w-[760px] rounded-[22px] border border-[#e5e9e2] bg-white p-3 shadow-[0_10px_35px_rgba(42,55,43,0.05)] focus-within:border-[#a9c4ad]"
          >
            <Textarea
              aria-label="Message Atelier"
              placeholder="Message Atelier..."
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault()
                  event.currentTarget.form?.requestSubmit()
                }
              }}
              rows={2}
              className="max-h-40 min-h-[70px] resize-none border-0 px-2 py-2 text-[15px] shadow-none focus-visible:ring-0"
            />
            <div className="flex items-center justify-between px-1">
              <span className="text-xs text-[#a1a6a0]">A mock conversation space</span>
              <Button
                type="submit"
                size="icon"
                aria-label="Send message"
                disabled={!draft.trim()}
                className="size-9 rounded-xl bg-[#42734d] text-white hover:bg-[#35653f]"
              >
                <ArrowUp size={18} />
              </Button>
            </div>
          </form>
          <p className="mt-3 text-center text-[11px] text-[#a5aaa4]">
            This is a local demo. Messages are not saved.
          </p>
        </div>
      </section>
    </main>
  )
}
