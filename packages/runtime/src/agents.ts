import { Agent, type AgentMiddleware, type AgentOptions } from '@anvia/core'
import type { AnyTool } from '@anvia/core/tool'
import { getModel } from './models.ts'
import { getLensClient } from './observability.ts'
import { defaultInstructions } from './prompts/default.ts'
import { createWebSearchTools } from './tools/web-search/index.ts'

export type SandboxToolset = {
  tools: readonly AnyTool[]
  instructions: string
  middlewares: readonly AgentMiddleware[]
}
export type CreateAgentOptions = Partial<AgentOptions> & { sandbox?: SandboxToolset }

function getDefaultTools() {
  const apiKey = process.env.EXA_API_KEY
  if (!apiKey) throw new Error('EXA_API_KEY is required')
  return Object.values(createWebSearchTools(apiKey))
}

export function createAgent({ sandbox, ...options }: CreateAgentOptions = {}) {
  return new Agent({
    ...options,
    id: options.id ?? 'assistant',
    model: options.model ?? getModel(),
    instructions:
      options.instructions ??
      (sandbox ? `${defaultInstructions}\n\n${sandbox.instructions}` : defaultInstructions),
    middlewares: [...(options.middlewares ?? []), ...(sandbox?.middlewares ?? [])],
    tools: options.tools ?? [...getDefaultTools(), ...(sandbox?.tools ?? [])],
    memory: options.memory,
    observability: options.observability ?? {
      observers: { lens: getLensClient().observer() },
      primaryTrace: 'lens',
    },
  })
}
