import { Text } from '@react-email/components'
import React from 'react'

import { CtaButton, EmailLayout } from './common.js'

export function ragFailedSubject(props: { filename: string }): string {
  return `Document indexing failed — ${props.filename}`
}

export default function RagFailedEmail(props: {
  name: string
  filename: string
  errorMessage: string
  retryUrl: string
}): React.ReactElement {
  return (
    <EmailLayout preview="We had trouble processing your document. Here's what happened.">
      <Text>Hi {props.name},</Text>
      <Text>We could not index your document: {props.filename}</Text>
      <Text>Error summary: {props.errorMessage}</Text>
      <Text>
        Common causes: password-protected PDF, image-only scan, or unsupported format.
      </Text>
      <CtaButton href={props.retryUrl} label="Upload Again" />
    </EmailLayout>
  )
}
