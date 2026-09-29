import { expect, test } from '@playwright/test'

test('platform home page loads', async ({ page }, testInfo) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'Platform is ready' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Get started' })).toBeVisible()

  await testInfo.attach('platform-home', {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  })
})
