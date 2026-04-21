import { Text } from '@react-email/components'
import React from 'react'

import { env } from '../config/env.js'
import { CtaButton, EmailLayout } from './common.js'

export function topupReceiptSubject(props: { amountPaise: number; tokensGranted: number }): string {
  const amount = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(
    props.amountPaise / 100,
  )
  return `Credits added — ${amount} · ${props.tokensGranted.toLocaleString()} tokens`
}

export default function TopupReceiptEmail(props: {
  name: string
  amountPaise: number
  tokensGranted: number
  packName: string
}): React.ReactElement {
  const amount = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(
    props.amountPaise / 100,
  )
  return (
    <EmailLayout preview={`${props.tokensGranted.toLocaleString()} tokens added to your account.`}>
      <Text>Hi {props.name},</Text>
      <Text>
        Your {props.packName.replace(/_/g, ' ')} purchase is complete: {amount} for{' '}
        {props.tokensGranted.toLocaleString()} tokens.
      </Text>
      <CtaButton href={`${env.APP_URL}/settings/billing`} label="View billing" />
    </EmailLayout>
  )
}
