import { z } from 'zod'

export const chatRequestSchema = z
  .object({
    type: z.literal('messages'),
    messages: z
      .array(
        z
          .object({
            role: z.literal('user'),
            content: z.string().trim().min(1).max(4_000),
          })
          .strict(),
      )
      .length(1),
    metadata: z.object({ sessionId: z.uuid() }).strict(),
  })
  .strict()
