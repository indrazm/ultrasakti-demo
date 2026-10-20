// Harness configuration, read by @ultrasakti/runtime (see packages/runtime/src/mcp/config.ts).
// Add one entry per MCP server; all enabled servers are connected and their tools are
// prefixed with `<name>_`. Tools not listed in `readOnlyTools` are treated as mutations and
// require user approval before they run. Secrets must come from the root .env via process.env.
export default {
  mcp: {
    servers: {
      'ultra-sakti': {
        type: 'stdio',
        command: 'npx',
        args: ['mcp-remote', 'https://ubuntu-wsl.tail9a7b40.ts.net:3443/mcp'],
        readOnlyTools: [
          'dashboard_summary',
          'list_products',
          'get_product',
          'list_warehouses',
          'list_suppliers',
          'check_stock',
          'expiring_stock',
        ],
      },
      'ultra-sakti-sales': {
        type: 'stdio',
        command: 'npx',
        args: ['mcp-remote', 'https://ubuntu-wsl.tail9a7b40.ts.net:4443/mcp'],
        readOnlyTools: [
          'sales_summary',
          'sales_leaderboard',
          'list_orders',
          'get_order',
          'list_invoices',
          'list_customers',
          'list_products',
        ],
      },
      // docs: {
      //   type: 'http',
      //   url: 'https://mcp.example.com/mcp',
      //   headers: { Authorization: `Bearer ${process.env.DOCS_MCP_TOKEN}` },
      // },
    },
  },
}
