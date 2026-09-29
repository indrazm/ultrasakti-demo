import { expect, test } from '@playwright/test'

test('mock chat supports local conversations', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')

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
