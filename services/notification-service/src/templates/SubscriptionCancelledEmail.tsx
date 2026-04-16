import { Text } from '@react-email/components'
import React from 'react'

import { CtaButton, EmailLayout } from './common.js'

export const subscriptionCancelledSubject = 'Your subscription has been cancelled'

export default function SubscriptionCancelledEmail(props: {
  name: string
  planName: string
  accessUntil: string
  dashboardUrl: string
  reactivateUrl: string
}): React.ReactElement {
  return (
    <EmailLayout preview={`You'll have access to ${props.planName} until ${props.accessUntil}.`}>
      <Text>Hi {props.name},</Text>
      <Text>We are sorry to see you go.</Text>
      <Text>Your {props.planName} subscription has been cancelled.</Text>
      <Text>You will continue to have full access until {props.accessUntil}.</Text>
      <Text>After that, your account will be downgraded to the free plan.</Text>
      <CtaButton href={props.reactivateUrl} label="Reactivate Subscription" />
      <CtaButton href={props.dashboardUrl} label="Open Dashboard" />
    </EmailLayout>
  )
}
