import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { summarizeToolCall, ToolCall } from './tool-call'

const base = {
  id: 'p1',
  type: 'tool' as const,
  toolName: 'ultra-sakti-sales_list_orders',
  toolCallId: 't1',
}

describe('tool call', () => {
  it('shows the tool name and a summary of its arguments', () => {
    render(
      <ToolCall
        part={{
          ...base,
          state: 'output-available',
          input: { status: 'draft', limit: 5 },
          output: [],
        }}
      />,
    )
    expect(screen.getByText(/ultra-sakti-sales_list_orders/)).toBeVisible()
    expect(screen.getByText(/- status: draft, limit: 5/)).toBeVisible()
  })

  it('omits the separator when there are no arguments', () => {
    expect(summarizeToolCall({ ...base, state: 'input-available', input: {} })).toBe('')
  })

  it('truncates long values and flattens whitespace', () => {
    const summary = summarizeToolCall({
      ...base,
      state: 'input-available',
      input: { command: `python -c "${'x'.repeat(200)}"\n` },
    })
    expect(summary).toHaveLength(90)
    expect(summary.endsWith('…')).toBe(true)
  })

  it('summarizes a failure', () => {
    expect(
      summarizeToolCall({ ...base, state: 'error', input: {}, error: { message: 'timed out' } }),
    ).toBe('failed: timed out')
  })

  it('leads with the most descriptive argument', () => {
    expect(
      summarizeToolCall({
        ...base,
        state: 'input-available',
        input: { cwd: '/workspace/abc', command: 'python chart.py' },
      }),
    ).toBe('command: python chart.py, cwd: /workspace/abc')
  })
})
