import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { HomePage } from './home-page'

describe('platform home page', () => {
  it('renders the seeded mock conversation', () => {
    render(<HomePage />)

    expect(screen.getByRole('heading', { name: 'Planning a product launch' })).toBeVisible()
    expect(screen.getByText('What should we focus on in the first two weeks?')).toBeVisible()
    expect(screen.getByRole('textbox', { name: 'Message Atelier' })).toBeVisible()
  })
})
