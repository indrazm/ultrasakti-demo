import { Agent, type AgentOptions } from '@anvia/core'
import { getModel } from './models.ts'
import { defaultInstructions } from './prompts/default.ts'
import { createWebSearchTools } from './tools/web-search/index.ts'

export type CreateAgentOptions = Partial<AgentOptions>

function getDefaultTools() {
  const apiKey = process.env.EXA_API_KEY
  if (!apiKey) throw new Error('EXA_API_KEY is required')
  return Object.values(createWebSearchTools(apiKey))
}

export function createAgent(options: CreateAgentOptions = {}) {
  return new Agent({
    ...options,
    id: options.id ?? 'assistant',
    model: options.model ?? getModel(),
    instructions: options.instructions ?? defaultInstructions,
    tools: options.tools ?? getDefaultTools(),
  })
}
