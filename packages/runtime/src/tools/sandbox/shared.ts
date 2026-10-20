import { createHash } from 'node:crypto'
import { DockerSandboxClient, DockerSandboxError, type DockerSandbox } from '@anvia/sandbox'
import { ARTIFACTS_DIR, createSandboxTools, sandboxInstructions } from './index.ts'

const WORKDIR = '/workspace'
const MAX_ARTIFACT_BYTES = 20 * 1024 * 1024
const SESSION_ID = /^[0-9a-f-]{36}$/i
const ARTIFACT_NAME = /^(?!\.)[A-Za-z0-9._-]{1,200}$/
const IMAGE = 'ghcr.io/astral-sh/uv:python3.13-bookworm-slim'
const IDLE_TIMEOUT_MS = 30 * 60_000

type Entry = { sandbox: Promise<DockerSandbox | undefined>; idleTimer?: NodeJS.Timeout }

const client = new DockerSandboxClient()
const entries = new Map<string, Entry>()
let imagePulled: Promise<void> | undefined

function pullImage() {
  imagePulled ??= client.pullImage({ image: IMAGE }).catch((error: unknown) => {
    imagePulled = undefined
    throw error
  })
  return imagePulled
}

// A stable id per user lets a restarted API process find the container it left running.
function sandboxId(userId: string) {
  return `ultrasakti-${createHash('sha256').update(userId).digest('hex').slice(0, 24)}`
}

async function openSandbox(userId: string, create: boolean) {
  const id = sandboxId(userId)
  try {
    return await client.resumeSandbox({ id })
  } catch (error) {
    if (!(error instanceof DockerSandboxError) || error.code !== 'sandbox_not_found') throw error
    if (!create) return undefined
  }
  await pullImage()
  return client.createSandbox({
    id,
    image: IMAGE,
    workdir: WORKDIR,
    workspace: { type: 'ephemeral' },
    // Bridge networking lets the agent install packages (after asking the user) with uv.
    network: { mode: 'bridge' },
    labels: { app: 'ultrasakti' },
    resources: { memoryMb: 1024, cpus: 1, pidsLimit: 256 },
    security: { noNewPrivileges: true },
  })
}

async function getSandbox(userId: string, create: boolean) {
  let entry = entries.get(userId)
  if (!entry) {
    const created: Entry = { sandbox: openSandbox(userId, create) }
    const forget = () => {
      if (entries.get(userId) === created) entries.delete(userId)
    }
    created.sandbox.then((sandbox) => sandbox || forget(), forget)
    entries.set(userId, created)
    entry = created
  }
  const sandbox = await entry.sandbox
  if (sandbox) scheduleIdleDestroy(userId, entry)
  return sandbox
}

function scheduleIdleDestroy(key: string, entry: Entry) {
  clearTimeout(entry.idleTimer)
  entry.idleTimer = setTimeout(() => void stopSandbox(key), IDLE_TIMEOUT_MS)
  entry.idleTimer.unref()
}

async function stopSandbox(key: string) {
  const entry = entries.get(key)
  if (!entry) return
  entries.delete(key)
  clearTimeout(entry.idleTimer)
  await (await entry.sandbox.catch(() => undefined))?.stop().catch(() => undefined)
}

/**
 * Returns the sandbox tools and instructions for one chat session. Each user gets one container
 * shared by their conversations (each works in /workspace/<session-id>/), created on first use,
 * stopped after 30 idle minutes (and on shutdown) and resumed with its files when it is next needed. When Docker is unavailable the chat keeps
 * working without sandbox tools.
 */
export async function getSandboxToolset(userId: string, sessionId: string) {
  try {
    const sandbox = await getSandbox(userId, true)
    if (!sandbox) return undefined
    return {
      tools: createSandboxTools(sandbox.runtime),
      instructions: sandboxInstructions(sessionId),
    }
  } catch (error) {
    console.error(
      'Sandbox unavailable',
      error instanceof DockerSandboxError
        ? error.code
        : error instanceof Error
          ? error.name
          : 'UnknownError',
    )
    return undefined
  }
}

/**
 * Reads a file the agent saved under `artifacts/<name>` in the user's sandbox, under that session's folder. Returns
 * undefined when the path is invalid, the sandbox is gone, or the file does not exist. It never
 * creates a sandbox, but it reattaches to one a previous API process left running.
 */
export async function readSandboxArtifact(userId: string, sessionId: string, name: string) {
  if (!SESSION_ID.test(sessionId) || !ARTIFACT_NAME.test(name) || name.includes('..')) {
    return undefined
  }
  try {
    const sandbox = await getSandbox(userId, false)
    if (!sandbox) return undefined
    const path = `${sessionId}/${ARTIFACTS_DIR}/${name}`
    const data = await sandbox.runtime.readFile({ path })
    return data.byteLength <= MAX_ARTIFACT_BYTES ? data : undefined
  } catch {
    return undefined
  }
}

export async function closeSandboxes() {
  await Promise.all([...entries.keys()].map(stopSandbox))
}
