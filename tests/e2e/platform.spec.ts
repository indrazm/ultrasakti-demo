import { expect, test } from '@playwright/test'

test('email credentials support sign-up, sign-out, and sign-in', async ({ page }, testInfo) => {
  const email = `platform-${Date.now()}@example.com`
  const password = 'test-password-123'

  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Sign in to your account' })).toBeVisible()
  await testInfo.attach('platform-sign-in', {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  })

  await page.getByRole('button', { name: 'Sign up' }).click()
  await page.getByRole('textbox', { name: 'Name' }).fill('Platform Tester')
  await page.getByRole('textbox', { name: 'Email address' }).fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page.getByRole('heading', { name: 'Welcome, Platform Tester' })).toBeVisible()

  await page.reload()
  await expect(page.getByText(email)).toBeVisible()
  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page.getByRole('heading', { name: 'Sign in to your account' })).toBeVisible()

  await page.getByRole('textbox', { name: 'Email address' }).fill(email)
  await page.getByLabel('Password').fill('wrong-password')
  await page.getByRole('button', { name: 'Sign in', exact: true }).last().click()
  await expect(page.getByRole('alert')).toBeVisible()

  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in', exact: true }).last().click()
  await expect(page.getByRole('heading', { name: 'Welcome, Platform Tester' })).toBeVisible()
})
