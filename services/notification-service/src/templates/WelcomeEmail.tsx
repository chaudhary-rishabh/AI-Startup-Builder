import { Text } from '@react-email/components'
import React from 'react'

import { env } from '../config/env.js'
import { CtaButton, EmailLayout } from './common.js'

export const welcomeSubject = 'Welcome to AI Startup Builder 🚀'

export default function WelcomeEmail(props: { name: string; verifyUrl?: string }): React.ReactElement {
  return (
    <EmailLayout preview="Your AI-powered startup journey starts now.">
      <Text>Hi {props.name},</Text>
      <Text>
        Welcome to AI Startup Builder! You are ready to go from idea to launched product, guided by AI
        agents every step of the way.
      </Text>
      <Text>- Validate idea</Text>
      <Text>- Build PRD</Text>
      <Text>- Generate prototype</Text>
      <CtaButton href={`${env.APP_URL}/dashboard`} label="Start Your First Project" />
      {props.verifyUrl ? <CtaButton href={props.verifyUrl} label="Verify Email" /> : null}
    </EmailLayout>
  )
}
