import { Text } from '@react-email/components'
import React from 'react'

import { env } from '../config/env.js'
import { CtaButton, EmailLayout } from './common.js'

export const creditsWelcomeSubject = 'Your 50,000 free credits are ready 🚀'

export default function CreditsWelcomeEmail(props: { name: string }): React.ReactElement {
  return (
    <EmailLayout preview="Start building with your free token allowance.">
      <Text>Hi {props.name},</Text>
      <Text>Welcome to AI Startup Builder.</Text>
      <Text>
        You have 50,000 free tokens — enough to fully validate and plan your startup idea. No credit card required.
      </Text>
      <CtaButton href={`${env.APP_URL}/dashboard`} label="Start building →" />
    </EmailLayout>
  )
}
