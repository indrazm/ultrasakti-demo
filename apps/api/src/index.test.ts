import { describe, expect, it } from 'vitest'
import { app } from './index'

describe('API routes', () => {
  it('returns a healthy status', async () => {
    const response = await app.request('/api/health')

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ status: 'ok' })
  })

  it('validates and echoes a message', async () => {
    const response = await app.request('/api/echo', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message: 'hello' }),
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ message: 'hello' })
  })

  it('rejects an empty message', async () => {
    const response = await app.request('/api/echo', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message: '' }),
    })

    expect(response.status).toBe(400)
  })
})
