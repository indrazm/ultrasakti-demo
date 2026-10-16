import { createServer, type Server } from 'node:http'
import { once } from 'node:events'
import type { CompletionModel } from '@ultrasakti/runtime'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

let runtime: typeof import('@ultrasakti/runtime')
let collector: Server | undefined

const model: CompletionModel = {
  provider: 'test',
  modelId: 'observability-test',
  capabilities: {
    streaming: false,
    tools: false,
    toolChoice: false,
    imageInput: false,
    documentInput: false,
    outputSchema: false,
    reasoning: false,
  },
  async completion() {
    return {
      choice: [{ type: 'text', text: 'private-response-marker' }],
      usage: {
        inputTokens: 1,
        outputTokens: 1,
        totalTokens: 2,
        cachedInputTokens: 0,
        cacheCreationInputTokens: 0,
      },
      finishReason: 'stop',
      rawResponse: {},
    }
  },
}

beforeEach(async () => {
  vi.resetModules()
  for (const name of ['ANVIA_LENS_BASE_URL', 'ANVIA_LENS_PUBLIC_KEY', 'ANVIA_LENS_SECRET_KEY']) {
    vi.stubEnv(name, '')
  }
  runtime = await import('@ultrasakti/runtime')
})

afterEach(async () => {
  try {
    await runtime.closeRuntimeObservability()
  } finally {
    if (collector) {
      await new Promise<void>((resolve, reject) => {
        collector!.close((error) => (error ? reject(error) : resolve()))
      })
      collector = undefined
    }
    vi.unstubAllEnvs()
  }
})

it('exports a runtime trace on close without capturing prompt or response bodies', async () => {
  const payloads: string[] = []
  collector = createServer(async (request, response) => {
    const chunks: Buffer[] = []
    for await (const chunk of request) chunks.push(chunk)
    payloads.push(Buffer.concat(chunks).toString())
    response.writeHead(200, { 'content-type': 'application/json' })
    response.end('{}')
  }).listen(0, '127.0.0.1')
  await once(collector, 'listening')
  const address = collector.address()
  if (!address || typeof address === 'string') throw new Error('Expected TCP collector address')
  vi.stubEnv('ANVIA_LENS_BASE_URL', `http://127.0.0.1:${address.port}`)
  vi.stubEnv('ANVIA_LENS_PUBLIC_KEY', 'pk-test-local-only')
  vi.stubEnv('ANVIA_LENS_SECRET_KEY', 'sk-test-local-only')

  const client = runtime.getLensClient()
  const agent = runtime.createAgent({ model, tools: [] })
  const result = await agent.generate({
    prompt: 'private-prompt-marker',
    trace: { metadata: { email: 'person@example.com' } },
  })
  expect(result).toMatchObject({ output: 'private-response-marker' })
  expect(runtime.getLensClient()).toBe(client)
  await runtime.closeRuntimeObservability()
  await runtime.closeRuntimeObservability()

  const payload = payloads.join('\n')
  expect(payload).toContain('resourceSpans')
  expect(payload).toContain('observability-test')
  expect(payload).toContain('<redacted>')
  expect(payload).not.toContain('private-prompt-marker')
  expect(payload).not.toContain('private-response-marker')
  expect(payload).not.toContain('person@example.com')
  expect(payload).not.toContain('sk-test-local-only')
})

it('keeps agents usable when Lens is not configured', async () => {
  const agent = runtime.createAgent({ model, tools: [] })
  expect(runtime.getLensClient().enabled).toBe(false)
  expect(await agent.generate({ prompt: 'test' })).toMatchObject({
    output: 'private-response-marker',
  })
})

it('rejects partial Lens configuration', () => {
  vi.stubEnv('ANVIA_LENS_BASE_URL', 'http://127.0.0.1:1')
  expect(() => runtime.createAgent({ model, tools: [] })).toThrow('publicKey is required')
})

it('honors explicit observability without initializing the default Lens client', async () => {
  vi.stubEnv('ANVIA_LENS_BASE_URL', 'not-a-url')
  const agent = runtime.createAgent({ model, tools: [], observability: { observers: {} } })
  expect(await agent.generate({ prompt: 'test' })).toMatchObject({
    output: 'private-response-marker',
  })
})
