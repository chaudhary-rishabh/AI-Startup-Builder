import { Text } from '@react-email/components'
import React from 'react'

import { CtaButton, EmailLayout } from './common.js'

export const emailVerificationSubject = 'Verify your email address'

export default function EmailVerificationEmail(props: {
  name: string
  verifyUrl: string
  expiresInMinutes: number
}): React.ReactElement {
  return (
    <EmailLayout preview={`Your verification link expires in ${props.expiresInMinutes} minutes.`}>
      <Text>Hi {props.name},</Text>
      <Text>Please verify your email address to activate your account.</Text>
      <CtaButton href={props.verifyUrl} label="Verify Email" />
      <Text>This link expires in {props.expiresInMinutes} minutes.</Text>
      <Text>If you did not create this account, ignore this email.</Text>
    </EmailLayout>
  )
}
