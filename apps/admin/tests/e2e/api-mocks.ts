import type { Page } from '@playwright/test'

export async function installAdminApiMocks(page: Page) {
  await page.route('**/api/v1/auth/admin/login', async (route) => {
    const body = JSON.parse(route.request().postData() ?? '{}') as Record<
      string,
      string
    >
    if (body['email'] === 'locked@admin.com') {
      return route.fulfill({
        status: 423,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: {
            code: 'ACCOUNT_LOCKED',
            message: 'Account locked',
            lockoutEndsAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
          },
        }),
      })
    }
    if (body['password'] === 'wrongpassword') {
      return route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password',
          },
        }),
      })
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { requiresTotp: true, tempToken: 'temp_token_abc123' },
      }),
    })
  })

  await page.route('**/api/v1/auth/admin/verify-totp', async (route) => {
    const body = JSON.parse(route.request().postData() ?? '{}') as Record<
      string,
      string
    >
    if (body['totpCode'] === '000000') {
      return route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: {
            code: 'INVALID_TOTP',
            message: 'Invalid code — try again',
          },
        }),
      })
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          admin: {
            id: 'admin-1',
            email: 'admin@example.com',
            name: 'Super Admin',
            role: 'super_admin',
            avatarUrl: null,
            lastLoginAt: new Date().toISOString(),
          },
        },
      }),
    })
  })

  await page.route('**/api/v1/auth/admin/logout', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: {} }),
    })
  })

  await page.route('**/api/v1/auth/admin/refresh', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: { expiresIn: 900 } }),
    })
  })
}

export async function installDashboardApiMocks(page: Page) {
  await installAdminApiMocks(page)

  await page.route('**/api/v1/admin/kpis**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          totalUsers: 12847,
          activeToday: 1204,
          newThisWeek: 312,
          totalProjects: 34521,
          totalRevenueCents: 2480000,
          avgSessionMinutes: 28,
          changes: {
            totalUsers: 8.4,
            activeToday: 12.1,
            newThisWeek: -3.2,
            totalProjects: 11.7,
            totalRevenue: 14.3,
            avgSession: 2.1,
          },
        },
      }),
    })
  })

  await page.route('**/api/v1/admin/revenue**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: [
          {
            month: 'Jan 2025',
            mrr: 1800000,
            newMrr: 240000,
            churnedMrr: 42000,
          },
          {
            month: 'Feb 2025',
            mrr: 1920000,
            newMrr: 160000,
            churnedMrr: 40000,
          },
        ],
      }),
    })
  })

  await page.route('**/api/v1/admin/user-growth**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: [
          { week: 'Week of Mar 3', signups: 48, churned: 4 },
          { week: 'Week of Mar 10', signups: 71, churned: 6 },
        ],
      }),
    })
  })

  await page.route('**/api/v1/admin/users/recent**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: [
          {
            id: 'u-1',
            name: 'Priya Sharma',
            email: 'priya@startup.io',
            avatarUrl: null,
            plan: 'pro',
            signedUpAt: new Date().toISOString(),
            status: 'active',
          },
        ],
      }),
    })
  })

  await page.route('**/api/v1/admin/activity**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: [
          {
            id: 'ev-1',
            type: 'user.upgrade',
            actorName: 'Priya Sharma',
            actorAvatarUrl: null,
            description: 'Upgraded from Free to Pro',
            metadata: {},
            occurredAt: new Date().toISOString(),
          },
        ],
      }),
    })
  })
}
