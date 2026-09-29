import { OpenAIClient } from '@anvia/openai'

export function getModel(modelId?: string) {
  const apiKey = process.env.OPENAI_API_KEY
  const selectedModelId = modelId ?? process.env.OPENAI_MODEL_ID

  if (!apiKey) throw new Error('OPENAI_API_KEY is required')
  if (!selectedModelId) throw new Error('OPENAI_MODEL_ID is required when modelId is omitted')

  const baseUrl = process.env.OPENAI_BASE_URL
  const client = new OpenAIClient({ apiKey, ...(baseUrl ? { baseUrl } : {}) })
  return client.completionModel({ modelId: selectedModelId, api: 'chat' })
}

export type { CompletionModel } from '@anvia/core'
