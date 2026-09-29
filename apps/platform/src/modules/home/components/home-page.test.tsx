import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { HomePage } from './home-page'

vi.mock('../../auth/api/auth-client', () => ({
  authClient: { useSession: () => ({ data: null, isPending: false }) },
}))

describe('platform home page', () => {
  it('renders the email sign-in form', () => {
    render(<HomePage />)
    expect(screen.getByRole('heading', { name: 'Sign in to your account' })).toBeVisible()
    expect(screen.getByRole('textbox', { name: 'Email address' })).toBeVisible()
    expect(screen.getAllByRole('button', { name: 'Sign in' })[1]).toBeVisible()
  })
})
