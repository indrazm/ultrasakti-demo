// Harness configuration, read by @ultrasakti/runtime (see packages/runtime/src/mcp/config.ts).
// Add one entry per MCP server; all enabled servers are connected and their tools are
// prefixed with `<name>_`. Secrets must come from the root .env via process.env.
export default {
  mcp: {
    servers: {
      'ultra-sakti': {
        type: 'stdio',
        command: 'npx',
        args: ['mcp-remote', 'https://ubuntu-wsl.tail9a7b40.ts.net:3443/mcp'],
      },
      'ultra-sakti-sales': {
        type: 'stdio',
        command: 'npx',
        args: ['mcp-remote', 'https://ubuntu-wsl.tail9a7b40.ts.net:4443/mcp'],
      },
      // docs: {
      //   type: 'http',
      //   url: 'https://mcp.example.com/mcp',
      //   headers: { Authorization: `Bearer ${process.env.DOCS_MCP_TOKEN}` },
      // },
    },
  },
}
