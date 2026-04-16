import React from 'react'
import { describe, expect, it } from 'vitest'

import BillingReceiptEmail, { billingReceiptSubject } from '../../src/templates/BillingReceiptEmail.js'
import EmailVerificationEmail, { emailVerificationSubject } from '../../src/templates/EmailVerificationEmail.js'
import ExportReadyEmail, { exportReadySubject } from '../../src/templates/ExportReadyEmail.js'
import PasswordResetEmail, { passwordResetSubject } from '../../src/templates/PasswordResetEmail.js'
import PhaseCompleteEmail, { phaseCompleteSubject } from '../../src/templates/PhaseCompleteEmail.js'
import RagFailedEmail, { ragFailedSubject } from '../../src/templates/RagFailedEmail.js'
import SecurityAlertEmail, { securityAlertSubject } from '../../src/templates/SecurityAlertEmail.js'
import SubscriptionCancelledEmail, {
  subscriptionCancelledSubject,
} from '../../src/templates/SubscriptionCancelledEmail.js'
import TokenWarningEmail, { tokenWarningSubject } from '../../src/templates/TokenWarningEmail.js'
import WelcomeEmail, { welcomeSubject } from '../../src/templates/WelcomeEmail.js'

describe('templates', () => {
  it('renders WelcomeEmail', () => {
    expect(React.createElement(WelcomeEmail, { name: 'Ava' })).toBeTruthy()
  })

  it('renders PasswordResetEmail with optional ipAddress', () => {
    expect(
      React.createElement(PasswordResetEmail, {
        name: 'Ava',
        resetUrl: 'http://localhost/reset',
        expiresInMinutes: 30,
        ipAddress: '127.0.0.1',
      }),
    ).toBeTruthy()
  })

  it('renders PasswordResetEmail without ipAddress', () => {
    expect(
      React.createElement(PasswordResetEmail, {
        name: 'Ava',
        resetUrl: 'http://localhost/reset',
        expiresInMinutes: 30,
      }),
    ).toBeTruthy()
  })

  it('renders PhaseCompleteEmail for phase 1->2', () => {
    expect(
      React.createElement(PhaseCompleteEmail, {
        name: 'Ava',
        projectName: 'Nova',
        projectEmoji: '🚀',
        phaseNumber: 1,
        phaseName: 'Validation',
        nextPhaseName: 'Planning',
        nextPhaseUrl: 'http://localhost/project/1/plan',
        highlights: ['Problem validated'],
      }),
    ).toBeTruthy()
  })

  it('renders BillingReceiptEmail with null invoiceUrl', () => {
    expect(
      React.createElement(BillingReceiptEmail, {
        name: 'Ava',
        planName: 'Pro',
        amountFormatted: '$29.00',
        currency: 'usd',
        periodStart: 'Jan 1',
        periodEnd: 'Jan 31',
        invoiceUrl: null,
        billingPortalUrl: 'http://localhost/settings/billing',
      }),
    ).toBeTruthy()
  })

  it('token warning subjects vary by severity', () => {
    expect(tokenWarningSubject({ percentUsed: 95 })).toContain('95%')
    expect(tokenWarningSubject({ percentUsed: 80 })).toContain('80%')
    expect(
      React.createElement(TokenWarningEmail, {
        name: 'Ava',
        percentUsed: 95,
        tokensUsed: 95_000,
        tokensLimit: 100_000,
        tokensRemaining: 5_000,
        planName: 'Pro',
        upgradeUrl: 'http://localhost/settings/billing?upgrade=1',
        resetDate: 'May 1, 2026',
      }),
    ).toBeTruthy()
  })

  it('renders SecurityAlertEmail for all event types', () => {
    for (const eventType of ['brute_force', 'password_reset', 'new_device'] as const) {
      expect(
        React.createElement(SecurityAlertEmail, {
          name: 'Ava',
          eventType,
          timestamp: new Date().toISOString(),
          actionUrl: 'http://localhost/settings?tab=security',
        }),
      ).toBeTruthy()
    }
  })

  it('all templates export subject symbol', () => {
    expect(welcomeSubject).toBeTruthy()
    expect(emailVerificationSubject).toBeTruthy()
    expect(passwordResetSubject).toBeTruthy()
    expect(phaseCompleteSubject({ phaseNumber: 1, projectName: 'P', projectEmoji: '🚀' })).toBeTruthy()
    expect(billingReceiptSubject({ planName: 'Pro' })).toBeTruthy()
    expect(subscriptionCancelledSubject).toBeTruthy()
    expect(securityAlertSubject).toBeTruthy()
    expect(ragFailedSubject({ filename: 'doc.pdf' })).toBeTruthy()
    expect(exportReadySubject({ exportFormat: 'ZIP', projectName: 'P' })).toBeTruthy()
    expect(React.createElement(EmailVerificationEmail, { name: 'Ava', verifyUrl: 'u', expiresInMinutes: 10 })).toBeTruthy()
    expect(React.createElement(RagFailedEmail, { name: 'Ava', filename: 'a', errorMessage: 'e', retryUrl: 'u' })).toBeTruthy()
    expect(
      React.createElement(SubscriptionCancelledEmail, {
        name: 'Ava',
        planName: 'Pro',
        accessUntil: 'May 1',
        dashboardUrl: 'u',
        reactivateUrl: 'u',
      }),
    ).toBeTruthy()
    expect(
      React.createElement(ExportReadyEmail, {
        name: 'Ava',
        projectName: 'P',
        exportFormat: 'ZIP',
        downloadUrl: 'u',
        expiresInHours: 24,
      }),
    ).toBeTruthy()
  })
})
