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

// Gate every tool that is not declared read-only behind human approval.
function requireApprovalForMutations(
  server: McpServer,
  readOnlyTools: readonly string[],
): McpServer {
  const readOnly = new Set(readOnlyTools)
  return {
    ...server,
    tools: server.tools.map((tool) =>
      readOnly.has(tool.mcp.remoteName)
        ? tool
        : Object.freeze({
            ...tool,
            requiresApproval: { reason: `${tool.mcp.remoteName} changes data on ${server.name}` },
          }),
    ),
  }
}

/**
 * Connects every enabled MCP server in the config. A server that fails to connect is reported in
 * `failures` and does not prevent the others from being used. The caller owns `close()`.
 */
export async function connectMcpServers(config: HarnessConfig): Promise<McpConnection> {
  const entries = Object.entries(config.mcp.servers).filter(([, server]) => server.enabled)
  const clients = entries.map(([name, server]) => createClient(name, server))
  const readOnlyTools = new Map(entries.map(([name, server]) => [name, server.readOnlyTools]))

  const results = await Promise.allSettled(clients.map((client) => client.connect()))

  const servers: McpServer[] = []
  const failures: { name: string; error: unknown }[] = []
  const connected: McpClient[] = []
  results.forEach((result, index) => {
    const client = clients[index]!
    if (result.status === 'fulfilled') {
      servers.push(requireApprovalForMutations(result.value, readOnlyTools.get(client.name) ?? []))
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
