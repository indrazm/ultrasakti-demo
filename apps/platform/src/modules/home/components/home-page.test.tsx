import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ChatPage } from './chat-page'
import { HomePage } from './home-page'

vi.mock('../../auth/api/auth-client', () => ({
  authClient: { useSession: () => ({ data: null, isPending: false }) },
}))

describe('platform home page', () => {
  it('renders the email sign-in form for a signed-out visitor', () => {
    render(<HomePage />)
    expect(screen.getByRole('heading', { name: 'Sign in to your account' })).toBeVisible()
    expect(screen.getByRole('textbox', { name: 'Email address' })).toBeVisible()
    expect(screen.getAllByRole('button', { name: 'Sign in' })[1]).toBeVisible()
  })

  it('renders the mock conversation for a signed-in user', () => {
    render(
      <ChatPage
        user={{ name: 'Platform Tester', email: 'tester@example.com' }}
        onSignOut={vi.fn()}
        signOutPending={false}
        signOutError=""
      />,
    )
    expect(screen.getByRole('heading', { name: 'Planning a product launch' })).toBeVisible()
    expect(screen.getByText('What should we focus on in the first two weeks?')).toBeVisible()
    expect(screen.getByRole('textbox', { name: 'Message Atelier' })).toBeVisible()
    expect(screen.getByText('Platform Tester')).toBeVisible()
  })
})
