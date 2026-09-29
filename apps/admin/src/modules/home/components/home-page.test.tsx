import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { HomePage } from './home-page'

describe('admin home page', () => {
  it('renders the welcome content and primary action', () => {
    render(<HomePage />)

    expect(screen.getByRole('heading', { name: 'Platform is ready' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Get started' })).toBeVisible()
  })
})
