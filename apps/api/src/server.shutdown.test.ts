import { afterEach, beforeEach, expect, it, vi } from 'vitest'

const { closeServer, closeObservability, disconnectDatabase } = vi.hoisted(() => ({
  closeServer: vi.fn(),
  closeObservability: vi.fn(),
  disconnectDatabase: vi.fn(),
}))

vi.mock('@hono/node-server', () => ({ serve: () => ({ close: closeServer }) }))
vi.mock('@ultrasakti/runtime', () => ({ closeRuntimeObservability: closeObservability }))
vi.mock('@ultrasakti/db', () => ({ prisma: { $disconnect: disconnectDatabase } }))
vi.mock('./modules/auth/auth', () => ({
  auth: { handler: vi.fn() },
  platformOrigin: 'http://localhost:5173',
}))
vi.mock('./modules/chat/routes', async () => {
  const { Hono } = await import('hono')
  return { chatRoutes: new Hono() }
})
vi.mock('./modules/sessions/routes', async () => {
  const { Hono } = await import('hono')
  return { sessionsRoutes: new Hono() }
})

const signals = new Map<string | symbol, () => void>()

beforeEach(async () => {
  vi.resetModules()
  vi.useFakeTimers()
  vi.stubEnv('VITEST', '')
  closeServer.mockReset()
  closeObservability.mockReset().mockResolvedValue(undefined)
  disconnectDatabase.mockReset().mockResolvedValue(undefined)
  vi.spyOn(process, 'once').mockImplementation((signal, listener) => {
    signals.set(signal, listener)
    return process
  })
  vi.spyOn(process, 'exit').mockImplementation(() => undefined as never)
  vi.spyOn(console, 'error').mockImplementation(() => {})
  await import('./server')
})

afterEach(() => {
  signals.clear()
  vi.useRealTimers()
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

it('drains HTTP requests before closing telemetry and handles repeated signals once', async () => {
  signals.get('SIGTERM')!()
  signals.get('SIGINT')!()
  expect(closeServer).toHaveBeenCalledTimes(1)
  expect(closeObservability).not.toHaveBeenCalled()
  expect(disconnectDatabase).not.toHaveBeenCalled()
  expect(process.exit).not.toHaveBeenCalled()

  await closeServer.mock.calls[0][0]()
  expect(closeObservability).toHaveBeenCalledTimes(1)
  expect(disconnectDatabase).toHaveBeenCalledTimes(1)
  expect(process.exit).toHaveBeenCalledWith(0)
  expect(vi.getTimerCount()).toBe(0)
})

it('exits unsuccessfully if an active HTTP request prevents shutdown', async () => {
  signals.get('SIGTERM')!()
  await vi.advanceTimersByTimeAsync(30_000)
  expect(process.exit).toHaveBeenCalledWith(1)
  expect(console.error).toHaveBeenCalledWith('API shutdown timed out')
})

it('bounds shutdown even when the telemetry exporter never finishes', async () => {
  closeObservability.mockReturnValue(new Promise(() => {}))
  signals.get('SIGINT')!()
  void closeServer.mock.calls[0][0]()
  await vi.advanceTimersByTimeAsync(30_000)
  expect(process.exit).toHaveBeenCalledWith(1)
})

it('reports telemetry shutdown failure without exposing exporter error details', async () => {
  closeObservability.mockRejectedValue(new Error('private exporter detail'))
  signals.get('SIGTERM')!()
  await closeServer.mock.calls[0][0]()
  expect(process.exit).toHaveBeenCalledWith(1)
  expect(console.error).toHaveBeenCalledExactlyOnceWith('Failed to close runtime observability')
  expect(vi.getTimerCount()).toBe(0)
})
