import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ChatPage } from './chat-page'
import { HomePage } from './home-page'

vi.mock('../api/sessions', () => ({
  listSessions: vi.fn().mockResolvedValue({ sessions: [], nextOffset: null }),
}))

vi.mock('../../auth/api/auth-client', () => ({
  authClient: { useSession: () => ({ data: null, isPending: false }) },
}))

describe('platform home page', () => {
  it('renders the email sign-in form for a signed-out visitor', () => {
    render(<HomePage activeSessionId={null} navigateToSession={vi.fn()} />)
    expect(screen.getByRole('heading', { name: 'Sign in to your account' })).toBeVisible()
    expect(screen.getByRole('textbox', { name: 'Email address' })).toBeVisible()
    expect(screen.getAllByRole('button', { name: 'Sign in' })[1]).toBeVisible()
  })

  it('renders a ready chat for a signed-in user', () => {
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <ChatPage
          activeSessionId={null}
          navigateToSession={vi.fn()}
          user={{ id: 'test-user', name: 'Platform Tester', email: 'tester@example.com' }}
          onSignOut={vi.fn()}
          signOutPending={false}
          signOutError=""
        />
      </QueryClientProvider>,
    )
    expect(screen.getByRole('heading', { name: 'What can I help you with?' })).toBeVisible()
    expect(screen.getByRole('textbox', { name: 'Message Atelier' })).toBeVisible()
    expect(screen.getByText('Platform Tester')).toBeVisible()
  })
})
