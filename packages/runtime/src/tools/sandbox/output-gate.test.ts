import assert from 'node:assert/strict'
import { describe, it, mock } from 'node:test'
import type { DockerSandboxRuntime } from '@anvia/sandbox'
import { createLargeOutputGate, LARGE_OUTPUT_LIMIT } from './output-gate.ts'

const sessionId = '00000000-0000-4000-8000-000000000001'

type WriteOptions = { path: string; text: string }

function setup(write: (options: WriteOptions) => Promise<void> = async () => {}) {
  const writeTextFile = mock.fn(write)
  const gate = createLargeOutputGate(
    { writeTextFile } as unknown as DockerSandboxRuntime,
    sessionId,
  )
  const run = (toolName: string, result: string) =>
    gate.onToolOutput!({
      toolName,
      result,
      args: '{}',
      originalResult: result,
      turn: 1,
      internalCallId: 'abcdef12-3456',
    })
  return { writeTextFile, run }
}

describe('large output gate', () => {
  it('leaves results at the limit untouched', async () => {
    const { run, writeTextFile } = setup()
    assert.equal(await run('list_orders', 'x'.repeat(LARGE_OUTPUT_LIMIT)), undefined)
    assert.equal(writeTextFile.mock.callCount(), 0)
  })

  it('saves a longer result and returns the file name, absolute path and how to read it', async () => {
    const { run, writeTextFile } = setup()
    const result = JSON.stringify(Array.from({ length: 2000 }, (_, id) => ({ id })))
    const message = (await run('ultra-sakti_list products', result)) as string

    const path = `${sessionId}/tool-outputs/ultra-sakti_list_products-abcdef12.json`
    assert.deepEqual(writeTextFile.mock.calls[0]!.arguments, [{ path, text: result }])
    assert.match(message, /File name: ultra-sakti_list_products-abcdef12\.json/)
    assert.ok(message.includes(`Absolute path: /workspace/${path}`))
    assert.ok(message.includes(`read_file with path "${path}"`))
    assert.ok(!message.includes('"id":1999'))
  })

  it('uses a txt file for output that is not JSON', async () => {
    const { run, writeTextFile } = setup()
    await run('fetch', 'word '.repeat(3000))
    assert.match(writeTextFile.mock.calls[0]!.arguments[0].path, /fetch-abcdef12\.txt$/)
  })

  it('never gates the sandbox tools', async () => {
    const { run, writeTextFile } = setup()
    assert.equal(await run('read_file', 'x'.repeat(LARGE_OUTPUT_LIMIT * 2)), undefined)
    assert.equal(writeTextFile.mock.callCount(), 0)
  })

  it('keeps the original result when the file cannot be written', async () => {
    const log = mock.method(console, 'error', () => {})
    const { run } = setup(async () => {
      throw new Error('disk full /secret/path')
    })
    assert.equal(await run('list_orders', 'x'.repeat(LARGE_OUTPUT_LIMIT + 1)), undefined)
    assert.deepEqual(log.mock.calls[0]!.arguments, ['Could not save large tool output', 'Error'])
    log.mock.restore()
  })
})
