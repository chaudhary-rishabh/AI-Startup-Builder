import { Text } from '@react-email/components'
import React from 'react'

import { CtaButton, EmailLayout } from './common.js'

export function billingReceiptSubject(props: { planName: string }): string {
  return `Receipt — ${props.planName} Plan`
}

export default function BillingReceiptEmail(props: {
  name: string
  planName: string
  amountFormatted: string
  currency: string
  periodStart: string
  periodEnd: string
  invoiceUrl: string | null
  billingPortalUrl: string
}): React.ReactElement {
  return (
    <EmailLayout preview={`Your payment of ${props.amountFormatted} was successful.`}>
      <Text>Hi {props.name},</Text>
      <Text>Payment Confirmed</Text>
      <Text>Plan: {props.planName}</Text>
      <Text>Amount: {props.amountFormatted}</Text>
      <Text>
        Period: {props.periodStart} - {props.periodEnd}
      </Text>
      <Text>Status: Paid</Text>
      {props.invoiceUrl ? <CtaButton href={props.invoiceUrl} label="Download Invoice" /> : null}
      <CtaButton href={props.billingPortalUrl} label="Manage Billing" />
    </EmailLayout>
  )
}
