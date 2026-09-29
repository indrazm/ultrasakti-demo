import { prisma } from '@ultrasakti/db'
import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'

export const platformOrigin = process.env.PLATFORM_ORIGIN
const baseURL = process.env.BETTER_AUTH_URL
const secret = process.env.BETTER_AUTH_SECRET

if (!platformOrigin) {
  throw new Error('PLATFORM_ORIGIN must be set before starting the API')
}
if (!baseURL) {
  throw new Error('BETTER_AUTH_URL must be set before starting the API')
}
if (!secret || secret.length < 32) {
  throw new Error('BETTER_AUTH_SECRET must contain at least 32 characters')
}

export const auth = betterAuth({
  baseURL,
  secret,
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  emailAndPassword: { enabled: true },
  trustedOrigins: [platformOrigin],
})
