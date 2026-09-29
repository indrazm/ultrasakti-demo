import { MessageSquare, Plus, Sparkles } from 'lucide-react'
import { Avatar, AvatarFallback } from '@ultrasakti/ui/components/avatar'
import { Button } from '@ultrasakti/ui/components/button'

type ChatSidebarProps = {
  user: { name: string; email: string }
  title?: string
  onNewChat: () => void
}

export function ChatSidebar({ user, title, onNewChat }: ChatSidebarProps) {
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
        >
          <Plus size={18} /> New chat
        </Button>
      </div>
      <nav aria-label="Conversations" className="mt-9 min-h-0 flex-1 px-3">
        <p className="px-3 pb-2 text-xs font-semibold text-[#8b908b]">Current conversation</p>
        {title ? (
          <p className="flex items-center gap-3 truncate rounded-lg bg-[#e5e9e1] px-3 py-2 text-sm">
            <MessageSquare size={16} />
            {title}
          </p>
        ) : (
          <p className="px-3 py-2 text-sm text-[#8b908b]">No messages yet</p>
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
