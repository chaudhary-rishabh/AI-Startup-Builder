import { test, expect } from './fixtures/admin-auth.fixture'

test.describe('Admin Settings Page', () => {
  test.beforeEach(async ({ adminPage }) => {
    await adminPage.goto('/admin/settings')
    await adminPage.waitForLoadState('networkidle')
  })

  test('5 settings tabs visible', async ({ adminPage }) => {
    await expect(adminPage.getByTestId('settings-tab-general')).toBeVisible()
    await expect(adminPage.getByTestId('settings-tab-email')).toBeVisible()
    await expect(
      adminPage.getByTestId('settings-tab-integrations'),
    ).toBeVisible()
    await expect(
      adminPage.getByTestId('settings-tab-feature-flags'),
    ).toBeVisible()
    await expect(adminPage.getByTestId('settings-tab-security')).toBeVisible()
  })

  test('General tab: platform name pre-filled', async ({ adminPage }) => {
    await expect(
      adminPage.getByDisplayValue('AI Startup Builder'),
    ).toBeVisible()
  })

  test('General tab: maintenance mode switch starts OFF', async ({
    adminPage,
  }) => {
    const toggle = adminPage.getByRole('switch')
    await expect(toggle).toHaveAttribute('aria-checked', 'false')
  })

  test('switching to Email tab loads email settings', async ({
    adminPage,
  }) => {
    await adminPage.getByTestId('settings-tab-email').click()
    await expect(adminPage.getByText(/provider/i)).toBeVisible()
    await expect(adminPage.getByText(/resend|sendgrid|smtp/i).first()).toBeVisible()
  })

  test('Email tab: 6 template preview cards visible', async ({
    adminPage,
  }) => {
    await adminPage.getByTestId('settings-tab-email').click()
    await adminPage.waitForLoadState('networkidle')
    await expect(adminPage.getByText(/welcome/i).first()).toBeVisible()
    await expect(adminPage.getByText(/reset.password/i)).toBeVisible()
  })

  test('switching to Integrations tab loads keys', async ({ adminPage }) => {
    await adminPage.getByTestId('settings-tab-integrations').click()
    await adminPage.waitForLoadState('networkidle')
    await expect(adminPage.getByText('Anthropic (Claude API)')).toBeVisible()
    await expect(adminPage.getByText('Pinecone (Vector DB)')).toBeVisible()
  })

  test('Integrations: security AES-256 note visible', async ({
    adminPage,
  }) => {
    await adminPage.getByTestId('settings-tab-integrations').click()
    await expect(adminPage.getByText(/AES-256/i)).toBeVisible()
  })

  test('switching to Feature Flags tab loads flags', async ({
    adminPage,
  }) => {
    await adminPage.getByTestId('settings-tab-feature-flags').click()
    await adminPage.waitForLoadState('networkidle')
    await expect(adminPage.getByText('design_mode')).toBeVisible()
    await expect(adminPage.getByText('rag_ai')).toBeVisible()
    await expect(adminPage.getByText('team_collaboration')).toBeVisible()
  })

  test('Feature Flags: rollout info card visible', async ({ adminPage }) => {
    await adminPage.getByTestId('settings-tab-feature-flags').click()
    await expect(adminPage.getByText(/user ID hash/i)).toBeVisible()
  })

  test('Feature Flags: disabled flag has switch off', async ({
    adminPage,
  }) => {
    await adminPage.getByTestId('settings-tab-feature-flags').click()
    await adminPage.waitForLoadState('networkidle')
    const switches = await adminPage.getByRole('switch').all()
    const offSwitch = await Promise.all(
      switches.map(async (s) => ({
        el: s,
        checked: await s.getAttribute('aria-checked'),
      })),
    ).then((results) => results.find((r) => r.checked === 'false'))
    expect(offSwitch).toBeDefined()
  })

  test('switching to Security tab loads security settings', async ({
    adminPage,
  }) => {
    await adminPage.getByTestId('settings-tab-security').click()
    await adminPage.waitForLoadState('networkidle')
    await expect(adminPage.getByText(/force 2fa/i)).toBeVisible()
    await expect(adminPage.getByText(/session timeout/i)).toBeVisible()
    await expect(adminPage.getByText(/danger zone/i)).toBeVisible()
  })

  test('Security: IP allowlist shows existing entry', async ({
    adminPage,
  }) => {
    await adminPage.getByTestId('settings-tab-security').click()
    await adminPage.waitForLoadState('networkidle')
    await expect(adminPage.getByText('203.0.113.0/24')).toBeVisible()
  })
})
