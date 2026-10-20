const { resolve, join } = require('node:path')

const root = resolve(__dirname, '..')

module.exports = {
  apps: [
    {
      name: 'ultrasakti',
      cwd: join(root, 'apps/api'),
      script: 'src/server.ts',
      interpreter: process.execPath,
      node_args: [`--env-file=${join(root, '.env')}`, '--import=tsx'],
      env: { NODE_ENV: 'production' },
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      wait_ready: true,
      listen_timeout: 15000,
      kill_timeout: 40000,
      time: true,
    },
  ],
}
