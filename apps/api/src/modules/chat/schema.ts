import { z } from 'zod'

export const chatRequestSchema = z
  .object({
    type: z.literal('messages'),
    messages: z.array(z.unknown()).min(1).max(40),
  })
  .passthrough()
  .refine((body) => JSON.stringify(body).length <= 64_000, 'Chat request is too large')
