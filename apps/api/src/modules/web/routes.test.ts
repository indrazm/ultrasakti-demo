import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, expect, it } from 'vitest'
import { createWebRoutes } from './routes'

let root: string
beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'ultrasakti-web-'))
  await mkdir(join(root, 'assets'))
  await writeFile(join(root, 'index.html'), '<main>Platform shell</main>')
  await writeFile(join(root, 'assets', 'app.js'), 'console.log("platform")')
})
afterAll(async () => rm(root, { recursive: true, force: true }))

it('serves the platform for the root and saved conversation URLs without caching HTML', async () => {
  const app = createWebRoutes(root)
  for (const path of ['/', '/s/conversation-id']) {
    const response = await app.request(path)
    expect(response.status).toBe(200)
    expect(await response.text()).toContain('Platform shell')
    expect(response.headers.get('cache-control')).toBe('no-cache')
  }
})

it('caches existing assets but returns 404 for missing assets and API routes', async () => {
  const app = createWebRoutes(root)
  const asset = await app.request('/assets/app.js')
  expect(asset.status).toBe(200)
  expect(asset.headers.get('cache-control')).toContain('immutable')
  for (const path of ['/assets/missing.js', '/api', '/api/missing']) {
    const response = await app.request(path)
    expect(response.status).toBe(404)
    expect(await response.text()).not.toContain('Platform shell')
  }
})

it('handles HEAD requests without returning the HTML body', async () => {
  const response = await createWebRoutes(root).request('/s/conversation-id', { method: 'HEAD' })
  expect(response.status).toBe(200)
  expect(await response.text()).toBe('')
})
