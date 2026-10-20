import { loadHarnessConfig } from './config.ts'
import { connectMcpServers, type McpConnection } from './connect.ts'

let connection: Promise<McpConnection> | undefined

async function connect() {
  const mcp = await connectMcpServers(await loadHarnessConfig())
  for (const { name, error } of mcp.failures) {
    console.error(
      `MCP server "${name}" failed to connect`,
      error instanceof Error ? error.name : 'UnknownError',
    )
  }
  return mcp
}

/** Connects the servers in harness.config.ts once per process and shares the connection. */
export function getMcpConnection() {
  connection ??= connect().catch((error: unknown) => {
    connection = undefined
    throw error
  })
  return connection
}

export async function closeMcpConnection() {
  const pending = connection
  connection = undefined
  if (pending) await (await pending).close()
}
