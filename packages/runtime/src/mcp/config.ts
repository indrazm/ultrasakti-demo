import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { z } from 'zod'

const serverName = z.string().regex(/^[a-z][a-z0-9-]*$/, 'Use lowercase letters, digits and dashes')

const stdioServer = z.object({
  type: z.literal('stdio'),
  command: z.string().min(1),
  args: z.array(z.string()).optional(),
  env: z.record(z.string(), z.string()).optional(),
  cwd: z.string().optional(),
})

const httpServer = z.object({
  type: z.literal('http'),
  url: z.url(),
  headers: z.record(z.string(), z.string()).optional(),
})

const mcpServer = z.discriminatedUnion('type', [stdioServer, httpServer]).and(
  z.object({
    enabled: z.boolean().default(true),
  }),
)

const harnessConfig = z.object({
  mcp: z.object({ servers: z.record(serverName, mcpServer).default({}) }).default({ servers: {} }),
})

export type McpServerConfig = z.output<typeof mcpServer>
export type HarnessConfig = z.output<typeof harnessConfig>

export const HARNESS_CONFIG_FILE = 'harness.config.ts'

export function parseHarnessConfig(input: unknown): HarnessConfig {
  const result = harnessConfig.safeParse(input)
  if (!result.success) {
    throw new Error(`Invalid ${HARNESS_CONFIG_FILE}:\n${z.prettifyError(result.error)}`)
  }
  return result.data
}

function findConfigPath(startDir: string) {
  let dir = resolve(startDir)
  while (true) {
    const candidate = join(dir, HARNESS_CONFIG_FILE)
    if (existsSync(candidate)) return candidate
    const parent = dirname(dir)
    if (parent === dir) return undefined
    dir = parent
  }
}

/**
 * Loads `harness.config.ts`, searching upward from `startDir` (default: the working directory)
 * so apps resolve the repository-root file. Returns an empty config when no file exists.
 */
export async function loadHarnessConfig(startDir = process.cwd()): Promise<HarnessConfig> {
  const path = findConfigPath(startDir)
  if (!path) return parseHarnessConfig({})

  const module = (await import(pathToFileURL(path).href)) as { default?: unknown }
  return parseHarnessConfig(module.default)
}
