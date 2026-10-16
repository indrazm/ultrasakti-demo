import { z } from 'zod'

export const createSessionSchema = z.object({}).strict()
export const sessionParamsSchema = z.object({ sessionId: z.uuid() })
export const sessionListSchema = z.object({
  offset: z.coerce.number().int().min(0).max(100_000).default(0),
})
export type SessionListInput = z.infer<typeof sessionListSchema>
