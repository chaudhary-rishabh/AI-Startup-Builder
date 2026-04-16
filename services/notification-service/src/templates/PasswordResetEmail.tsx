import { Text } from '@react-email/components'
import React from 'react'

import { CtaButton, EmailLayout } from './common.js'

export const passwordResetSubject = 'Reset your password'

export default function PasswordResetEmail(props: {
  name: string
  resetUrl: string
  expiresInMinutes: number
  ipAddress?: string
}): React.ReactElement {
  return (
    <EmailLayout preview="A password reset was requested for your account.">
      <Text>Hi {props.name},</Text>
      <Text>We received a request to reset the password for your account.</Text>
      <CtaButton href={props.resetUrl} label="Reset Password" />
      <Text>This link expires in {props.expiresInMinutes} minutes.</Text>
      {props.ipAddress ? <Text>This request was made from IP: {props.ipAddress}</Text> : null}
      <Text>If you did not request this, your account is safe. No action needed.</Text>
    </EmailLayout>
  )
}
