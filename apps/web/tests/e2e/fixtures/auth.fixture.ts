import { test as base, expect, type Page } from '@playwright/test'

const E2E_AUTH_COOKIE = {
  name: 'access_token',
  value: 'e2e:onboardingDone=true',
  domain: 'localhost',
  path: '/',
  httpOnly: true,
  secure: false,
  sameSite: 'Lax' as const,
}

interface AuthFixtures {
  authenticatedPage: Page
  projectPage: Page
  withAuthCookie: () => Promise<void>
}

export const test = base.extend<AuthFixtures>({
  withAuthCookie: async ({ context }, use) => {
    await use(async () => {
      await context.addCookies([
        {
          name: 'access_token',
          value: 'e2e:onboardingDone=false',
          domain: 'localhost',
          path: '/',
          httpOnly: true,
          secure: false,
          sameSite: 'Lax',
        },
      ])
    })
  },

  authenticatedPage: async ({ page, context }, use) => {
    await context.addCookies([E2E_AUTH_COOKIE])
    await page.goto('/')
    await use(page)
  },

  projectPage: async ({ page, context }, use) => {
    await context.addCookies([E2E_AUTH_COOKIE])
    await page.goto('/project/proj-1')
    await use(page)
  },
})

export { expect }
