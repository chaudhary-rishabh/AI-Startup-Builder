import { Section, Text } from '@react-email/components'
import React from 'react'

import { CtaButton, EmailLayout } from './common.js'

export const securityAlertSubject = 'Security alert for your account'

function messageForEvent(eventType: 'brute_force' | 'password_reset' | 'new_device'): string {
  switch (eventType) {
    case 'brute_force':
      return 'Multiple failed login attempts were detected on your account.'
    case 'password_reset':
      return 'Your password was recently changed.'
    default:
      return 'A new device signed in to your account.'
  }
}

export default function SecurityAlertEmail(props: {
  name: string
  eventType: 'brute_force' | 'password_reset' | 'new_device'
  ipAddress?: string
  timestamp: string
  actionUrl: string
}): React.ReactElement {
  return (
    <EmailLayout preview="Unusual activity detected on your AI Startup Builder account.">
      <Section style={{ backgroundColor: '#b91c1c', color: '#ffffff', padding: '8px 12px' }}>
        <Text style={{ margin: 0 }}>Security Alert</Text>
      </Section>
      <Text>Hi {props.name},</Text>
      <Text>{messageForEvent(props.eventType)}</Text>
      {props.ipAddress ? (
        <Text>
          From IP: {props.ipAddress} at {props.timestamp}
        </Text>
      ) : null}
      <CtaButton href={props.actionUrl} label="Review Account Security" />
      <Text>If this was you, no action is needed. If not, change your password immediately.</Text>
    </EmailLayout>
  )
}
