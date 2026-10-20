import { createDockerSandboxTools, type DockerSandboxRuntime } from '@anvia/sandbox'

export const ARTIFACTS_DIR = 'artifacts'

export function sandboxInstructions(sessionId: string) {
  return `You have a sandbox: an isolated Linux container with Python 3.13 and uv. It is yours for this user across all of their conversations and its files persist, so keep each conversation's work apart: do all work in the folder \`/workspace/${sessionId}/\`. Create it first with an absolute path (\`mkdir -p /workspace/${sessionId}/artifacts\`), then run commands with that folder as cwd (the file tools read_file, write_file and list_files take paths relative to \`/workspace\`, so start them with \`${sessionId}/\`), and keep scripts, data and outputs inside it. Do not read or change other folders in \`/workspace\`; they belong to other conversations.

Use the sandbox instead of estimating whenever the task involves analysis, research, math or data work: run code, read the output and report what it actually printed. Prefer pandas for tabular data and statistics. Write scripts to files and run them with exec_command; use start_process, list_processes, read_process_logs and stop_process for long-running work, and list_ports and wait_for_port for servers you start.

Only the Python standard library is guaranteed. Before importing a package, check that it exists (for example \`python -c "import pandas"\`). If it is missing, tell the user which package you need and ask for permission to install it in the sandbox first. Install only after they agree, with \`uv pip install --system <package>\`.

Sharing files and images: the user cannot see the sandbox file system. To give them a file (a chart, an image, a CSV), save it in the sandbox at \`/workspace/${sessionId}/${ARTIFACTS_DIR}/<file>\` (the folder from the step above). <file> is a single file name made of letters, digits, \`-\`, \`_\` and \`.\`, with the right extension and no subfolders (for example \`sales-by-day.png\`); saving under an existing name replaces that file. For charts use matplotlib with \`savefig\`. After saving, confirm the file exists, then link it with exactly this URL form, with no spaces and no other host or path:

\`/s/${sessionId}/artifacts/<file>\`

Always show an image or chart inline with \`![description](/s/${sessionId}/artifacts/<file>)\`, written exactly like that with nothing between the parentheses except the URL. Do not link to an image or chart, do not write "download" links for it, and do not repeat the URL as text; the user can save it from the displayed image. Only for non-image files (a CSV, a PDF), give a link, \`[name](/s/${sessionId}/artifacts/<file>)\`. Never invent a URL for a file you did not save, and never use file:// or sandbox paths in your reply. Saved files stay available to the user across restarts, but processes you started stop when the sandbox idles.`
}

export function createSandboxTools(sandbox: DockerSandboxRuntime) {
  return createDockerSandboxTools({
    sandbox,
    tools: [
      'exec_command',
      'read_file',
      'write_file',
      'list_files',
      'list_ports',
      'start_process',
      'list_processes',
      'read_process_logs',
      'stop_process',
      'wait_for_port',
    ],
    exec: { defaultTimeoutMs: 60_000, maxTimeoutMs: 300_000 },
  })
}
