// Harness configuration, read by @ultrasakti/runtime (see packages/runtime/src/mcp/config.ts).
// Add one entry per MCP server; all enabled servers are connected and their tools are
// prefixed with `<name>_`. Tools not listed in `readOnlyTools` are treated as mutations and
// require user approval before they run. Secrets must come from the root .env via process.env.
export default {
  mcp: {
    servers: {
      // docs: {
      //   type: 'http',
      //   url: 'https://mcp.example.com/mcp',
      //   headers: { Authorization: `Bearer ${process.env.DOCS_MCP_TOKEN}` },
      // },
    },
  },
}
