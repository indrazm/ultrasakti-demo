import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ApprovalPrompt } from './approval-prompt'

const request = {
  id: 'approval-1',
  type: 'tool-approval',
  toolName: 'ultra-sakti-sales_create_order',
  input: { customer: 'Budi' },
  reason: 'create_order changes data on ultra-sakti-sales',
}

describe('approval prompt', () => {
  it('shows the tool call and reports the decision', () => {
    const onRespond = vi.fn()
    render(<ApprovalPrompt request={request} onRespond={onRespond} />)

    expect(screen.getByText('ultra-sakti-sales_create_order')).toBeVisible()
    expect(screen.getByText(/"customer": "Budi"/)).toBeVisible()

    fireEvent.click(screen.getByRole('button', { name: 'Approve' }))
    fireEvent.click(screen.getByRole('button', { name: 'Deny' }))
    expect(onRespond.mock.calls).toEqual([[true], [false]])
  })
})
