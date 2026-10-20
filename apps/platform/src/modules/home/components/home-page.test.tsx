import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { messagesToUIMessages } from '@anvia/client'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { loadSession } from '../api/sessions'
import { ChatPage } from './chat-page'
import { HomePage } from './home-page'

vi.mock('../api/sessions', () => ({
  listSessions: vi.fn().mockResolvedValue({ sessions: [], nextOffset: null }),
  loadSession: vi.fn(),
}))

vi.mock('../../auth/api/auth-client', () => ({
  authClient: { useSession: () => ({ data: null, isPending: false }) },
}))

describe('platform home page', () => {
  beforeEach(() => {
    vi.mocked(loadSession).mockReset()
  })

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

  it('switches conversations without a visible loading banner and waits before enabling the composer', async () => {
    let resolveHistory!: (messages: Awaited<ReturnType<typeof loadSession>>) => void
    const pending = new Promise<Awaited<ReturnType<typeof loadSession>>>((resolve) => {
      resolveHistory = resolve
    })
    vi.mocked(loadSession)
      .mockResolvedValueOnce(
        messagesToUIMessages([{ role: 'user', content: 'First conversation' }]),
      )
      .mockReturnValueOnce(pending)
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const page = (sessionId: string) => (
      <QueryClientProvider client={client}>
        <ChatPage
          activeSessionId={sessionId}
          navigateToSession={vi.fn()}
          user={{ id: 'test-user', name: 'Platform Tester', email: 'tester@example.com' }}
          onSignOut={vi.fn()}
          signOutPending={false}
          signOutError=""
        />
      </QueryClientProvider>
    )
    const view = render(page('first-session'))
    await screen.findByRole('heading', { name: 'First conversation' })

    view.rerender(page('second-session'))
    expect(screen.queryByText('Loading conversation…')).not.toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Conversation' })).toHaveAttribute(
      'aria-busy',
      'true',
    )
    expect(screen.getByRole('textbox', { name: 'Message Atelier' })).toBeDisabled()

    await act(async () => {
      resolveHistory(messagesToUIMessages([{ role: 'user', content: 'Second conversation' }]))
    })
    await screen.findByRole('heading', { name: 'Second conversation' })
    expect(screen.getByRole('region', { name: 'Conversation' })).toHaveAttribute(
      'aria-busy',
      'false',
    )
    expect(screen.getByRole('textbox', { name: 'Message Atelier' })).toBeEnabled()
  })

  it('keeps history failures visible and lets the user retry', async () => {
    vi.mocked(loadSession)
      .mockRejectedValueOnce(new Error('Offline'))
      .mockResolvedValueOnce(
        messagesToUIMessages([{ role: 'user', content: 'Recovered conversation' }]),
      )
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <ChatPage
          activeSessionId="failed-session"
          navigateToSession={vi.fn()}
          user={{ id: 'test-user', name: 'Platform Tester', email: 'tester@example.com' }}
          onSignOut={vi.fn()}
          signOutPending={false}
          signOutError=""
        />
      </QueryClientProvider>,
    )
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load this conversation.')
    expect(screen.getByRole('textbox', { name: 'Message Atelier' })).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    await screen.findByRole('heading', { name: 'Recovered conversation' })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Message Atelier' })).toBeEnabled()
  })

  it('renders assistant replies as markdown', async () => {
    vi.mocked(loadSession).mockResolvedValueOnce(
      messagesToUIMessages([
        { role: 'user', content: 'Latest orders' },
        {
          role: 'assistant',
          content: '**Latest** orders:\n\n| Order | Status |\n|---|---|\n| SO-1 | Draft |',
        },
      ]),
    )
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <ChatPage
          activeSessionId="markdown-session"
          navigateToSession={vi.fn()}
          user={{ id: 'test-user', name: 'Platform Tester', email: 'tester@example.com' }}
          onSignOut={vi.fn()}
          signOutPending={false}
          signOutError=""
        />
      </QueryClientProvider>,
    )
    expect(await screen.findByRole('table')).toBeVisible()
    expect(screen.getByRole('columnheader', { name: 'Status' })).toBeVisible()
    expect(screen.getByText('Latest', { selector: 'strong' })).toBeVisible()
  })
})
