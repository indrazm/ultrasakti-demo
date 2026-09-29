import { MessageSquare, Plus, Search, Sparkles } from 'lucide-react'
import { Avatar, AvatarFallback } from '@ultrasakti/ui/components/avatar'
import { Button } from '@ultrasakti/ui/components/button'

type ConversationItem = { id: number; title: string }

type ChatSidebarProps = {
  user: { name: string; email: string }
  conversations: ConversationItem[]
  activeId: number | null
  searchOpen: boolean
  search: string
  onSearchOpenChange: (open: boolean) => void
  onSearchChange: (value: string) => void
  onSelect: (id: number | null) => void
}

export function ChatSidebar({
  user,
  conversations,
  activeId,
  searchOpen,
  search,
  onSearchOpenChange,
  onSearchChange,
  onSelect,
}: ChatSidebarProps) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-[#f3f3f0] text-[#242725]">
      <div className="flex items-center gap-2.5 px-5 pb-5 pt-5">
        <span className="flex size-8 items-center justify-center rounded-xl bg-[#d7e6d7] text-[#356747]">
          <Sparkles size={17} />
        </span>
        <span className="text-[17px] font-semibold tracking-tight">atelier</span>
      </div>
      <div className="space-y-1 px-3">
        <Button
          variant="ghost"
          className="h-10 w-full justify-start gap-3 px-3 hover:bg-[#e9eae5]"
          onClick={() => onSelect(null)}
        >
          <Plus size={18} /> New chat
        </Button>
        <Button
          variant="ghost"
          className="h-10 w-full justify-start gap-3 px-3 hover:bg-[#e9eae5]"
          onClick={() => onSearchOpenChange(!searchOpen)}
        >
          <Search size={18} /> Search chats
        </Button>
        {searchOpen && (
          <input
            aria-label="Search conversations"
            className="h-9 w-full rounded-lg border border-[#dedfd9] bg-white px-3 text-sm outline-none focus:border-[#7b9d82]"
            placeholder="Search conversations"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        )}
      </div>
      <nav aria-label="Conversations" className="mt-9 min-h-0 flex-1 overflow-y-auto px-3">
        <p className="px-3 pb-2 text-xs font-semibold text-[#8b908b]">Recent</p>
        <div className="space-y-0.5">
          {conversations.map((conversation) => (
            <Button
              key={conversation.id}
              variant="ghost"
              aria-current={conversation.id === activeId ? 'page' : undefined}
              className={`h-10 w-full justify-start overflow-hidden px-3 text-left text-sm font-normal hover:bg-[#e9eae5] ${conversation.id === activeId ? 'bg-[#e5e9e1] font-medium' : ''}`}
              onClick={() => onSelect(conversation.id)}
            >
              <MessageSquare size={16} className="mr-1.5 text-[#888e88]" />
              <span className="truncate">{conversation.title}</span>
            </Button>
          ))}
          {conversations.length === 0 && (
            <p className="px-3 py-2 text-sm text-[#8b908b]">No matching chats</p>
          )}
        </div>
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
