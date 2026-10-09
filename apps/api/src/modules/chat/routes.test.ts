import { parseClientStreamFrame } from '@anvia/client'
import { createAgent } from '@ultrasakti/runtime'
import { describe, expect, it, vi } from 'vitest'
import { app } from '../../index'

vi.mock('../auth/auth', () => ({
  auth: {
    handler: vi.fn(),
    api: { getSession: vi.fn().mockResolvedValue({ user: { id: 'test' } }) },
  },
  platformOrigin: 'http://localhost:5173',
}))

vi.mock('@ultrasakti/runtime', () => ({
  createAgent: vi.fn(() => ({
    stream: async function* () {
      yield { type: 'text_delta', turn: 1, delta: 'Hello from the agent.' }
      yield {
        type: 'response',
        runId: 'test-run',
        text: 'Hello from the agent.',
        output: 'Hello from the agent.',
        usage: {
          inputTokens: 1,
          outputTokens: 5,
          totalTokens: 6,
          cachedInputTokens: 0,
          cacheCreationInputTokens: 0,
        },
        messages: [],
      }
    },
  })),
}))

describe('chat stream boundary', () => {
  it('projects agent events into framed JSONL from the authenticated route', async () => {
    const response = await app.request('/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'messages', messages: [{ role: 'user', content: 'Hello' }] }),
    })

    expect(response.status).toBe(200)
    expect(response.headers.get('x-anvia-stream-protocol')).toBe('anvia.client.v3')
    const frames = (await response.text())
      .trim()
      .split('\n')
      .map((line) => parseClientStreamFrame(JSON.parse(line)))
    expect(frames[0]).toMatchObject({ type: 'stream_start', protocol: 'anvia.client.v3' })
    expect(frames).toContainEqual(
      expect.objectContaining({
        type: 'stream_event',
        event: expect.objectContaining({ type: 'text_delta', delta: 'Hello from the agent.' }),
      }),
    )
    expect(frames.at(-1)).toMatchObject({ type: 'stream_end', status: 'completed' })
    expect(createAgent).toHaveBeenCalledOnce()
  })

  it('records a stream failure while masking the client error', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(createAgent).mockReturnValueOnce({
      stream: async function* () {
        yield { type: 'text_delta', turn: 1, delta: 'Partial response' }
        throw new Error('private provider detail')
      },
    } as never)

    const response = await app.request('/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'messages', messages: [{ role: 'user', content: 'Hello' }] }),
    })
    const body = await response.text()

    expect(body).toContain('The assistant could not complete this response.')
    expect(body).not.toContain('private provider detail')
    expect(log).toHaveBeenCalledWith('Chat stream failed', 'Error')
    log.mockRestore()
  })
})
