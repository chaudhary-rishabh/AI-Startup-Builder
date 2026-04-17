import { expect, test } from '@playwright/test'

test('Landing page renders both panels', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText(/build your startup/i)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Sign Up' })).toBeVisible()
})

test('Sign Up tab -> Log In tab switch', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Log In' }).click()
  await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
  await page.getByRole('button', { name: 'Sign Up' }).click()
  await expect(page.getByRole('button', { name: /create account/i })).toBeVisible()
})

test('Sign Up form validation', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /create account/i }).click()
  await expect(page.getByText('Name must be at least 2 characters')).toBeVisible()
})

test('Login with invalid credentials', async ({ page }) => {
  await page.goto('/')
  await page.route('**/auth/login', (route) =>
    route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid' } }),
    }),
  )
  await page.getByRole('button', { name: 'Log In' }).click()
  await page.getByLabel('Email').fill('test@example.com')
  await page.getByLabel('Password', { exact: true }).fill('wrong')
  await page.getByRole('button', { name: /sign in/i }).click()
  await expect(page).toHaveURL(/\/$/)
})

test('Protected route without cookie redirects to /', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/\?redirect=%2Fdashboard/)
})
