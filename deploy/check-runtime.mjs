import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { once } from 'node:events'

const child = spawn(process.execPath, ['--import=tsx', 'src/server.ts'], {
  cwd: new URL('../apps/api/', import.meta.url),
  env: {
    PATH: process.env.PATH,
    HOME: process.env.HOME,
    NODE_ENV: 'production',
    PORT: '0',
    DATABASE_URL: process.env.DATABASE_URL ?? 'postgresql://ci:ci@localhost:5432/ultrasakti_ci',
    BETTER_AUTH_SECRET: 'production-runtime-check-secret-32-characters',
    BETTER_AUTH_URL: 'http://localhost:3000',
    PLATFORM_ORIGIN: 'http://localhost:3000',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
})
const exited = once(child, 'exit')
let output = ''
child.stderr.on('data', (chunk) => {
  output += chunk
})
try {
  const base = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Production startup timed out')), 15_000)
    child.stdout.on('data', (chunk) => {
      output += chunk
      const match = output.match(/API listening on (http:\/\/127\.0\.0\.1:\d+)/)
      if (match) {
        clearTimeout(timeout)
        resolve(match[1])
      }
    })
    child.once('error', (error) => {
      clearTimeout(timeout)
      reject(error)
    })
    child.once('exit', () => {
      clearTimeout(timeout)
      reject(new Error('Production server exited before readiness'))
    })
  })
  const root = await fetch(base)
  assert.equal(root.status, 200)
  assert.equal(root.headers.get('cache-control'), 'no-cache')
  const html = await root.text()
  assert.match(html, /<html/)
  assert.equal(await (await fetch(`${base}/s/smoke-conversation`)).text(), html)
  assert.deepEqual(await (await fetch(`${base}/api/health`)).json(), { status: 'ok' })
  for (const path of ['/api/missing', '/assets/missing.js']) {
    assert.equal((await fetch(`${base}${path}`)).status, 404)
  }
  const assetPath = html.match(/(?:src|href)="(\/assets\/[^"]+)"/)[1]
  const asset = await fetch(`${base}${assetPath}`)
  assert.equal(asset.status, 200)
  assert.match(asset.headers.get('cache-control'), /immutable/)
  await asset.arrayBuffer()
  child.kill('SIGINT')
  const [code, signal] = await Promise.race([
    exited,
    new Promise((_, reject) => {
      const timeout = setTimeout(() => reject(new Error('Production shutdown timed out')), 35_000)
      timeout.unref()
    }),
  ])
  assert.equal(signal, null)
  assert.equal(code, 0)
  console.log('Production runtime: UI, deep links, API, assets and graceful shutdown passed.')
} catch (error) {
  console.error(output)
  throw error
} finally {
  if (child.exitCode === null) child.kill('SIGKILL')
}
