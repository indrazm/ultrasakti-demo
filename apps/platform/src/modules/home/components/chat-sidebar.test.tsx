import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ChatSidebar } from './chat-sidebar'

const sessions = ['a', 'b'].map((id) => ({
  sessionId: id,
  title: `Chat ${id}`,
  createdAt: '2026-10-20T00:00:00Z',
  updatedAt: '2026-10-20T00:00:00Z',
}))

function renderSidebar(workingSessionId: string | null) {
  render(
    <ChatSidebar
      user={{ name: 'Tester', email: 'tester@example.com' }}
      sessions={sessions}
      activeSessionId="a"
      workingSessionId={workingSessionId}
      onNewChat={vi.fn()}
      onSelectSession={vi.fn()}
      disabled={false}
      loading={false}
      error={false}
      onRetry={vi.fn()}
      hasMore={false}
      loadingMore={false}
      onLoadMore={vi.fn()}
    />,
  )
}

describe('chat sidebar', () => {
  it('marks only the working conversation', () => {
    renderSidebar('a')
    expect(within(screen.getByRole('button', { name: /Chat a/ })).getByRole('status')).toBeVisible()
    expect(within(screen.getByRole('button', { name: /Chat b/ })).queryByRole('status')).toBeNull()
  })

  it('shows no indicator when idle', () => {
    renderSidebar(null)
    expect(screen.queryByRole('status')).toBeNull()
  })
})
