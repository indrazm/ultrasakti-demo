import type { McpServer } from '@anvia/core/mcp'
import { McpClient } from '@anvia/mcp'
import type { HarnessConfig, McpServerConfig } from './config.ts'

export type McpConnection = {
  servers: readonly McpServer[]
  failures: readonly { name: string; error: unknown }[]
  close: () => Promise<void>
}

function createClient(name: string, server: McpServerConfig) {
  return new McpClient({
    name,
    // Prefix tool names with the server name so tools from multiple servers cannot collide.
    tools: { prefix: `${name}_` },
    versionNegotiation: { mode: 'auto' },
    transport:
      server.type === 'stdio'
        ? {
            type: 'stdio',
            command: server.command,
            args: server.args,
            env: server.env,
            cwd: server.cwd,
          }
        : { type: 'streamableHttp', url: server.url, headers: server.headers },
  })
}

/**
 * Connects every enabled MCP server in the config. A server that fails to connect is reported in
 * `failures` and does not prevent the others from being used. The caller owns `close()`.
 */
export async function connectMcpServers(config: HarnessConfig): Promise<McpConnection> {
  const entries = Object.entries(config.mcp.servers).filter(([, server]) => server.enabled)
  const clients = entries.map(([name, server]) => createClient(name, server))

  const results = await Promise.allSettled(clients.map((client) => client.connect()))

  const servers: McpServer[] = []
  const failures: { name: string; error: unknown }[] = []
  const connected: McpClient[] = []
  results.forEach((result, index) => {
    const client = clients[index]!
    if (result.status === 'fulfilled') {
      servers.push(result.value)
      connected.push(client)
    } else {
      failures.push({ name: client.name, error: result.reason })
    }
  })

  return {
    servers,
    failures,
    close: async () => {
      await Promise.allSettled(connected.map((client) => client.close()))
    },
  }
}
