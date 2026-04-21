import { Text } from '@react-email/components'
import React from 'react'

import { env } from '../config/env.js'
import { CtaButton, EmailLayout } from './common.js'

export const creditsExhaustedSubject = 'Your free credits have been used — your work is safe ✓'

export default function CreditsExhaustedEmail(props: { name: string }): React.ReactElement {
  return (
    <EmailLayout preview="Your projects and files are still right where you left them.">
      <Text>Hi {props.name},</Text>
      <Text>
        All your projects, outputs, and files are still right where you left them. Add credits to keep building, or
        explore what you&apos;ve already made.
      </Text>
      <CtaButton href={`${env.APP_URL}/settings/billing#topup`} label="Add Credits from ₹199" />
      <CtaButton href={`${env.APP_URL}/dashboard`} label="View My Projects" />
    </EmailLayout>
  )
}
