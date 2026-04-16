import { Text } from '@react-email/components'
import React from 'react'

import { CtaButton, EmailLayout } from './common.js'

export function exportReadySubject(props: { exportFormat: string; projectName: string }): string {
  return `Your ${props.exportFormat} export is ready — ${props.projectName}`
}

export default function ExportReadyEmail(props: {
  name: string
  projectName: string
  exportFormat: string
  downloadUrl: string
  expiresInHours: number
}): React.ReactElement {
  return (
    <EmailLayout preview={`Download your ${props.projectName} export before it expires.`}>
      <Text>Hi {props.name},</Text>
      <Text>Your export is ready!</Text>
      <Text>
        {props.projectName} — {props.exportFormat}
      </Text>
      <CtaButton href={props.downloadUrl} label="Download Export" />
      <Text>This link expires in {props.expiresInHours} hours.</Text>
    </EmailLayout>
  )
}
