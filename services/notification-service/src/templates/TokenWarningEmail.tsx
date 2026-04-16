import { Section, Text } from '@react-email/components'
import React from 'react'

import { env } from '../config/env.js'
import { CtaButton, EmailLayout } from './common.js'

export function tokenWarningSubject(props: { percentUsed: 80 | 95 }): string {
  return props.percentUsed === 95
    ? "⚠️ You've used 95% of your monthly tokens"
    : "You've used 80% of your monthly tokens"
}

export default function TokenWarningEmail(props: {
  name: string
  percentUsed: 80 | 95
  tokensUsed: number
  tokensLimit: number
  tokensRemaining: number
  planName: string
  upgradeUrl: string
  resetDate: string
}): React.ReactElement {
  const width = `${Math.min(100, props.percentUsed)}%`
  return (
    <EmailLayout preview={`${props.tokensRemaining.toLocaleString()} tokens remaining this month.`}>
      <Text>Hi {props.name},</Text>
      <Text>
        You have used {props.tokensUsed.toLocaleString()} / {props.tokensLimit.toLocaleString()} tokens on your{' '}
        {props.planName} plan this month.
      </Text>
      <Section style={{ width: '100%', backgroundColor: '#e2e8f0', borderRadius: '999px' }}>
        <Section style={{ width, backgroundColor: '#0D7377', height: '10px', borderRadius: '999px' }} />
      </Section>
      <Text>Your tokens reset on {props.resetDate}.</Text>
      {props.percentUsed === 95 ? <Text>Please upgrade soon to avoid interruptions.</Text> : null}
      <CtaButton href={props.upgradeUrl} label="Upgrade Plan" />
      <CtaButton href={`${env.APP_URL}/settings/billing`} label="View Usage" />
    </EmailLayout>
  )
}
