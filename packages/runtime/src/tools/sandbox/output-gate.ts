import { createMiddleware } from '@anvia/core'
import type { DockerSandboxRuntime } from '@anvia/sandbox'
import { SANDBOX_TOOL_NAMES, TOOL_OUTPUTS_DIR } from './index.ts'

export const LARGE_OUTPUT_LIMIT = 10_000

const sandboxTools = new Set<string>(SANDBOX_TOOL_NAMES)

function fileName(toolName: string, callId: string, result: string) {
  const extension = isJson(result) ? 'json' : 'txt'
  const safeName = toolName.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 80)
  return `${safeName}-${callId.replace(/[^A-Za-z0-9]/g, '').slice(0, 8)}.${extension}`
}

function isJson(text: string) {
  try {
    JSON.parse(text)
    return true
  } catch {
    return false
  }
}

function describeFile(toolName: string, length: number, relative: string) {
  return [
    `The output of ${toolName} was ${length.toLocaleString('en-US')} characters, too long to show here, so it was saved to a file in the sandbox.`,
    `File name: ${relative.split('/').pop()}`,
    `Absolute path: /workspace/${relative}`,
    `To read it: use read_file with path "${relative}" (it pages with startLine and lineCount), or run a command with exec_command, for example head, grep or jq, or a Python script with pandas for tabular or JSON data. Read only the parts you need.`,
  ].join('\n')
}

/**
 * Moves any tool result longer than LARGE_OUTPUT_LIMIT characters into a file in the sandbox and
 * returns instructions for reading it, so one large result cannot fill the model's context. The
 * sandbox tools are exempt: their output is already bounded, and the file would loop back here.
 * If the file cannot be written the original result is kept.
 */
export function createLargeOutputGate(sandbox: DockerSandboxRuntime, sessionId: string) {
  const folder = `${sessionId}/${TOOL_OUTPUTS_DIR}`
  return createMiddleware({
    async onToolOutput({ toolName, result, internalCallId }) {
      if (sandboxTools.has(toolName) || result.length <= LARGE_OUTPUT_LIMIT) return undefined
      const name = fileName(toolName, internalCallId, result)
      const path = `${folder}/${name}`
      try {
        await sandbox.writeTextFile({ path, text: result })
      } catch (error) {
        console.error(
          'Could not save large tool output',
          error instanceof Error ? error.name : 'UnknownError',
        )
        return undefined
      }
      return describeFile(toolName, result.length, path)
    },
  })
}
