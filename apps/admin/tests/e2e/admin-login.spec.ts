import { test, expect } from '@playwright/test'
import {
  installAdminApiMocks,
  installDashboardApiMocks,
} from './api-mocks'

test.describe('Admin Login', () => {
  test.beforeEach(async ({ page }) => {
    await installAdminApiMocks(page)
    await page.goto('/admin/login')
  })

  test('renders Brown Dark background', async ({ page }) => {
    const bg = await page.evaluate(() =>
      window.getComputedStyle(document.body).backgroundColor,
    )
    expect(bg).toMatch(/92.*60.*37|5c4425|rgb\(92,\s*68,\s*37\)/i)
  })

  test('shows email + password inputs on credentials step', async ({
    page,
  }) => {
    await expect(page.getByPlaceholder(/admin@/i)).toBeVisible()
    await expect(page.getByPlaceholder(/••••/)).toBeVisible()
  })

  test('shows inline error on wrong password', async ({ page }) => {
    await page.fill('input[type="email"]', 'admin@example.com')
    await page.fill('input[type="password"]', 'wrongpassword')
    await page.getByRole('button', { name: /continue/i }).click()
    await expect(page.getByText(/invalid email or password/i)).toBeVisible()
  })

  test('advances to TOTP step on correct credentials', async ({ page }) => {
    await page.fill('input[type="email"]', 'admin@example.com')
    await page.fill('input[type="password"]', 'correctpassword')
    await page.getByRole('button', { name: /continue/i }).click()
    await expect(page.getByText(/two-factor/i)).toBeVisible()
    await expect(page.getByPlaceholder('000000')).toBeVisible()
  })

  test('TOTP input is numeric only with large font', async ({ page }) => {
    await page.fill('input[type="email"]', 'admin@example.com')
    await page.fill('input[type="password"]', 'correctpassword')
    await page.getByRole('button', { name: /continue/i }).click()
    const totpInput = page.getByPlaceholder('000000')
    expect(await totpInput.getAttribute('inputmode')).toBe('numeric')
    expect(await totpInput.getAttribute('maxlength')).toBe('6')
  })

  test('shows error on invalid TOTP code', async ({ page }) => {
    await page.fill('input[type="email"]', 'admin@example.com')
    await page.fill('input[type="password"]', 'correctpassword')
    await page.getByRole('button', { name: /continue/i }).click()
    await page.fill('input[placeholder="000000"]', '000000')
    await page.getByRole('button', { name: /login to admin/i }).click()
    await expect(page.getByText(/invalid code/i)).toBeVisible()
  })

  test('back to credentials link visible on TOTP step', async ({
    page,
  }) => {
    await page.fill('input[type="email"]', 'admin@example.com')
    await page.fill('input[type="password"]', 'correctpassword')
    await page.getByRole('button', { name: /continue/i }).click()
    await expect(page.getByText(/back to credentials/i)).toBeVisible()
  })

  test('protected route redirects to login without cookie', async ({
    page,
  }) => {
    await page.goto('/admin/dashboard')
    await expect(page).toHaveURL(/\/admin\/login/)
  })

  test('shows security note below card', async ({ page }) => {
    await expect(page.getByText(/platform administrators only/i)).toBeVisible()
  })
})

test.describe('Admin Dashboard (authenticated)', () => {
  test.beforeEach(async ({ page }) => {
    await installDashboardApiMocks(page)
  })

  test('dashboard loads with KPI cards', async ({ page, context }) => {
    await context.addCookies([
      {
        name: 'admin_token',
        value:
          'mock.eyJzdWIiOiJhZG1pbi0xIiwicm9sZSI6InN1cGVyX2FkbWluIiwiaWF0IjoxNzA1MzEyMjAwLCJleHAiOjk5OTk5OTk5OTl9.sig',
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        secure: false,
      },
    ])
    await page.goto('/admin/login')
    await page.evaluate(() => {
      localStorage.setItem(
        'admin-auth-store',
        JSON.stringify({
          state: {
            admin: {
              id: 'admin-1',
              email: 'admin@example.com',
              name: 'Super Admin',
              role: 'super_admin',
              avatarUrl: null,
              lastLoginAt: null,
            },
            isAuthenticated: true,
          },
          version: 0,
        }),
      )
    })
    await page.goto('/admin/dashboard')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('Total Users')).toBeVisible()
    await expect(page.getByText('Total Revenue')).toBeVisible()
    await expect(page.getByText('Monthly Recurring Revenue')).toBeVisible()
    await expect(page.getByText('User Growth')).toBeVisible()
  })

  test('admin sidebar shows ADMIN badge', async ({ page, context }) => {
    await context.addCookies([
      {
        name: 'admin_token',
        value:
          'mock.eyJzdWIiOiJhZG1pbi0xIiwicm9sZSI6InN1cGVyX2FkbWluIiwiaWF0IjoxNzA1MzEyMjAwLCJleHAiOjk5OTk5OTk5OTl9.sig',
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        secure: false,
      },
    ])
    await page.goto('/admin/login')
    await page.evaluate(() => {
      localStorage.setItem(
        'admin-auth-store',
        JSON.stringify({
          state: {
            admin: {
              id: 'admin-1',
              email: 'admin@example.com',
              name: 'Super Admin',
              role: 'super_admin',
              avatarUrl: null,
              lastLoginAt: null,
            },
            isAuthenticated: true,
          },
          version: 0,
        }),
      )
    })
    await page.goto('/admin/dashboard')
    await expect(page.getByText('ADMIN')).toBeVisible()
  })
})
