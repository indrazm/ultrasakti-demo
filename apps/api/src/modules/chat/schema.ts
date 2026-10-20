import { z } from 'zod'

const metadata = z.object({ sessionId: z.uuid() }).strict()

const messagesRequest = z
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
    metadata,
  })
  .strict()

const interactionResponseRequest = z
  .object({
    type: z.literal('interaction_response'),
    interactionId: z.string().min(1).max(200),
    response: z
      .object({
        type: z.literal('tool-approval'),
        approved: z.boolean(),
        reason: z.string().max(500).optional(),
      })
      .strict(),
    metadata,
  })
  .strict()

export const chatRequestSchema = z.discriminatedUnion('type', [
  messagesRequest,
  interactionResponseRequest,
])
