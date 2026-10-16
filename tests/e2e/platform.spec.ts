import { randomUUID } from 'node:crypto'
import { expect, test, type Page } from '@playwright/test'

const password = 'test-password-123'
let memoryDatabase: Promise<typeof import('../../packages/db/src/index')> | undefined
const memoryTestUsers = new Set<string>()

function getMemoryDatabase() {
  if (!memoryDatabase) {
    process.loadEnvFile('.env')
    memoryDatabase = import('../../packages/db/src/index')
  }
  return memoryDatabase
}

test.afterAll(async () => {
  if (!memoryDatabase) return
  const { prisma } = await memoryDatabase
  await prisma.agentMemorySession.deleteMany({ where: { userId: { in: [...memoryTestUsers] } } })
  await prisma.$disconnect()
})

async function signUp(page: Page) {
  const email = `platform-${randomUUID()}@example.com`
  await page.getByRole('button', { name: 'Sign up' }).click()
  await page.getByRole('textbox', { name: 'Name' }).fill('Platform Tester')
  await page.getByRole('textbox', { name: 'Email address' }).fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page.getByRole('heading', { name: 'What can I help you with?' })).toBeVisible()
  return email
}

async function mockChat(page: Page) {
  await page.route(
    `http://localhost:${process.env.E2E_API_PORT ?? 3000}/api/chat`,
    async (route) => {
      const request = route.request().postDataJSON()
      expect(request.messages).toHaveLength(1)
      await expect(page).toHaveURL(`/s/${request.metadata.sessionId}`)
      const authResponse = await page.request.get(
        `http://localhost:${process.env.E2E_API_PORT ?? 3000}/api/auth/get-session`,
      )
      const { user } = await authResponse.json()
      memoryTestUsers.add(user.id)
      const { memoryStore } = await getMemoryDatabase()
      await memoryStore.append({
        scope: { sessionId: request.metadata.sessionId, userId: user.id },
        runId: randomUUID(),
        turn: 1,
        messages: [
          request.messages[0],
          { role: 'assistant', content: 'Here is a simple starting plan.' },
        ],
      })
      const streamId = 'test-stream'
      const runId = 'test-run'
      const messageId = 'test-message'
      const partId = 'test-part'
      const events = [
        { type: 'run_start', runId, source: 'agent' },
        { type: 'message_start', runId, messageId, role: 'assistant' },
        { type: 'text_start', runId, messageId, partId },
        { type: 'text_delta', runId, messageId, partId, delta: 'Here is a simple starting plan.' },
        { type: 'text_end', runId, messageId, partId },
        { type: 'message_end', runId, messageId },
        { type: 'run_end', runId, status: 'completed', text: 'Here is a simple starting plan.' },
      ]
      const frames = [
        {
          type: 'stream_start',
          protocol: 'anvia.client.v3',
          streamId,
          eventId: 0,
          resumable: false,
        },
        ...events.map((event, index) => ({
          type: 'stream_event',
          streamId,
          eventId: index + 1,
          event,
        })),
        { type: 'stream_end', streamId, eventId: events.length, status: 'completed' },
      ]
      await route.fulfill({
        status: 200,
        headers: {
          'content-type': 'application/x-ndjson; charset=utf-8',
          'x-anvia-stream-protocol': 'anvia.client.v3',
          'access-control-expose-headers': 'x-anvia-stream-protocol',
          'access-control-allow-origin': 'http://localhost:4174',
          'access-control-allow-credentials': 'true',
        },
        body: frames.map((frame) => JSON.stringify(frame)).join('\n') + '\n',
      })
    },
  )
}

test('email credentials support sign-up, sign-out, and sign-in', async ({ page }, testInfo) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Sign in to your account' })).toBeVisible()
  await testInfo.attach('platform-sign-in', {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  })

  const email = await signUp(page)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'What can I help you with?' })).toBeVisible()
  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page.getByRole('heading', { name: 'Sign in to your account' })).toBeVisible()

  await page.getByRole('textbox', { name: 'Email address' }).fill(email)
  await page.getByLabel('Password').fill('wrong-password')
  await page.getByRole('button', { name: 'Sign in', exact: true }).last().click()
  await expect(page.getByRole('alert')).toBeVisible()

  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in', exact: true }).last().click()
  await expect(page.getByRole('heading', { name: 'What can I help you with?' })).toBeVisible()
})

test('chat sends a message and displays the streamed answer', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await mockChat(page)
  await page.goto('/')
  await signUp(page)

  await page.getByRole('button', { name: /Make a plan/ }).click()
  await expect(page.getByRole('textbox', { name: 'Message Atelier' })).toHaveValue(
    'Make a plan for a project I have in mind',
  )
  await page.getByRole('button', { name: 'Send message' }).click()
  await expect(page).toHaveURL(/\/s\/[\da-f-]+$/)
  await expect(page.getByText('Here is a simple starting plan.')).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Make a plan for a project I have in mind' }),
  ).toBeVisible()
  await testInfo.attach('chat-desktop', {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  })

  await page.getByRole('button', { name: 'New chat' }).click()
  await expect(page).toHaveURL('/')
  await expect(page.getByText('Here is a simple starting plan.')).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'What can I help you with?' })).toBeVisible()
})

test('chat stays usable on a narrow screen', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await signUp(page)

  await page.getByRole('button', { name: 'Open sidebar' }).click()
  await expect(page.getByRole('dialog', { name: 'Chats' })).toBeVisible()
  await page.getByRole('button', { name: 'New chat' }).click()
  await expect(page.getByRole('dialog', { name: 'Chats' })).toHaveCount(0)
  await testInfo.attach('chat-mobile', {
    body: await page.screenshot({ fullPage: true, animations: 'disabled' }),
    contentType: 'image/png',
  })
})

test('saved conversations can be switched, reloaded, and continued independently', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await mockChat(page)
  await page.goto('/')
  await signUp(page)
  const input = page.getByRole('textbox', { name: 'Message Atelier' })
  const send = page.getByRole('button', { name: 'Send message' })
  const conversations = page.getByRole('navigation', { name: 'Conversations' })

  await input.fill('Plan a garden')
  await send.click()
  await expect(page).toHaveURL(/\/s\/[\da-f-]+$/)
  const gardenUrl = page.url()
  await expect(page.getByText('Here is a simple starting plan.')).toBeVisible()
  await expect(conversations.getByRole('button', { name: 'Plan a garden' })).toBeVisible()
  await page.getByRole('button', { name: 'New chat', exact: true }).click()
  await expect(page).toHaveURL('/')
  await expect(page.getByText('Here is a simple starting plan.')).toHaveCount(0)
  await input.fill('Learn astronomy')
  await send.click()
  await expect(conversations.getByRole('button', { name: 'Learn astronomy' })).toBeVisible()
  await expect(page).toHaveURL(/\/s\/[\da-f-]+$/)
  const astronomyUrl = page.url()
  expect(astronomyUrl).not.toBe(gardenUrl)

  await conversations.getByRole('button', { name: 'Plan a garden' }).click()
  await expect(page).toHaveURL(gardenUrl)
  await expect(page.getByRole('heading', { name: 'Plan a garden' })).toBeVisible()
  await expect(page.getByText('Here is a simple starting plan.')).toBeVisible()
  await input.fill('Add tomatoes')
  await send.click()
  await expect(page.getByText('Here is a simple starting plan.')).toHaveCount(2)

  await page.reload()
  await expect(page).toHaveURL(gardenUrl)
  await expect(page.getByText('Add tomatoes', { exact: true })).toBeVisible()
  await expect(page.getByText('Here is a simple starting plan.')).toHaveCount(2)
  await testInfo.attach('saved-conversations', {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  })

  await conversations.getByRole('button', { name: 'Learn astronomy' }).click()
  await expect(page).toHaveURL(astronomyUrl)
  await expect(page.getByRole('heading', { name: 'Learn astronomy' })).toBeVisible()
  await expect(page.getByText('Add tomatoes', { exact: true })).toHaveCount(0)
  await expect(page.getByText('Here is a simple starting plan.')).toHaveCount(1)

  await page.goBack()
  await expect(page).toHaveURL(gardenUrl)
  await expect(page.getByText('Add tomatoes', { exact: true })).toBeVisible()
  await page.goForward()
  await expect(page).toHaveURL(astronomyUrl)
  await expect(page.getByText('Add tomatoes', { exact: true })).toHaveCount(0)
  await expect(page.getByText('Here is a simple starting plan.')).toHaveCount(1)

  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'What can I help you with?' })).toBeVisible()
  await expect(page.getByText('Here is a simple starting plan.')).toHaveCount(0)
  await page.goto(gardenUrl)
  await expect(page.getByText('Add tomatoes', { exact: true })).toBeVisible()
})

test('new chat clears a failed root draft before creating a conversation', async ({ page }) => {
  await mockChat(page)
  await page.goto('/')
  await signUp(page)
  await page.route(
    `http://localhost:${process.env.E2E_API_PORT ?? 3000}/api/sessions`,
    async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({ status: 503, json: { error: 'Storage unavailable' } })
      } else {
        await route.continue()
      }
    },
  )
  const input = page.getByRole('textbox', { name: 'Message Atelier' })
  await input.fill('This failed draft must be discarded')
  await page.getByRole('button', { name: 'Send message' }).click()
  await expect(page.getByRole('alert')).toBeVisible()
  await expect(page).toHaveURL('/')
  await page.getByRole('button', { name: 'New chat', exact: true }).click()
  await expect(page.getByRole('alert')).toHaveCount(0)
  await page.unroute(`http://localhost:${process.env.E2E_API_PORT ?? 3000}/api/sessions`)
  await input.fill('Start a fresh conversation')
  await page.getByRole('button', { name: 'Send message' }).click()
  await expect(page).toHaveURL(/\/s\/[\da-f-]+$/)
  await expect(page.getByText('Here is a simple starting plan.')).toBeVisible()
  await expect(page.getByText('This failed draft must be discarded')).toHaveCount(0)
})
