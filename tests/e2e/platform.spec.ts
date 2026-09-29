import { randomUUID } from 'node:crypto'
import { expect, test, type Page } from '@playwright/test'

const password = 'test-password-123'

async function signUp(page: Page) {
  const email = `platform-${randomUUID()}@example.com`
  await page.getByRole('button', { name: 'Sign up' }).click()
  await page.getByRole('textbox', { name: 'Name' }).fill('Platform Tester')
  await page.getByRole('textbox', { name: 'Email address' }).fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page.getByRole('heading', { name: 'Planning a product launch' })).toBeVisible()
  return email
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
  await expect(page.getByRole('heading', { name: 'Planning a product launch' })).toBeVisible()
  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page.getByRole('heading', { name: 'Sign in to your account' })).toBeVisible()

  await page.getByRole('textbox', { name: 'Email address' }).fill(email)
  await page.getByLabel('Password').fill('wrong-password')
  await page.getByRole('button', { name: 'Sign in', exact: true }).last().click()
  await expect(page.getByRole('alert')).toBeVisible()

  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in', exact: true }).last().click()
  await expect(page.getByRole('heading', { name: 'Planning a product launch' })).toBeVisible()
})

test('mock chat supports local conversations', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  await signUp(page)

  await expect(page.getByRole('heading', { name: 'Planning a product launch' })).toBeVisible()
  await expect(page.getByText('What should we focus on in the first two weeks?')).toBeVisible()

  await testInfo.attach('mock-chat-desktop', {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  })

  await page.getByRole('button', { name: 'Ideas for a team offsite' }).click()
  await expect(
    page.getByText('Can you suggest a few activities for a small team offsite?'),
  ).toBeVisible()
  await page.getByRole('textbox', { name: 'Message Atelier' }).fill('Add a team dinner too.')
  await page.getByRole('button', { name: 'Send message' }).click()
  await expect(page.getByText('Add a team dinner too.')).toBeVisible()

  await page.getByRole('button', { name: 'New chat' }).click()
  await expect(page.getByRole('heading', { name: 'What can I help you with?' })).toBeVisible()
  await page.getByRole('button', { name: /Make a plan/ }).click()
  await expect(page.getByRole('textbox', { name: 'Message Atelier' })).toHaveValue(
    'Make a plan for a project I have in mind',
  )
  await page.getByRole('button', { name: 'Send message' }).click()
  await expect(
    page.getByRole('heading', { name: 'Make a plan for a project I have in mind' }),
  ).toBeVisible()
  await expect(
    page.locator('[data-slot="message"]').getByText('Make a plan for a project I have in mind'),
  ).toBeVisible()
  await expect(page.getByRole('textbox', { name: 'Message Atelier' })).toHaveValue('')
})

test('mock chat stays usable on a narrow screen', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await signUp(page)

  await page.getByRole('button', { name: 'Open sidebar' }).click()
  await expect(page.getByRole('dialog', { name: 'Chats' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: 'Chats' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Open sidebar' })).toBeFocused()
  await expect(page.getByRole('button', { name: 'New chat' })).toHaveCount(0)

  await page.getByRole('button', { name: 'Open sidebar' }).click()
  await page.getByRole('button', { name: 'Search chats' }).click()
  await page.getByRole('textbox', { name: 'Search conversations' }).fill('offsite')
  await expect(page.getByRole('button', { name: 'Ideas for a team offsite' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Planning a product launch' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Ideas for a team offsite' }).click()
  await expect(page.getByRole('heading', { name: 'Ideas for a team offsite' })).toBeVisible()
  await expect(page.getByRole('dialog', { name: 'Chats' })).toHaveCount(0)

  await testInfo.attach('mock-chat-mobile', {
    body: await page.screenshot({ fullPage: true, animations: 'disabled' }),
    contentType: 'image/png',
  })
})
