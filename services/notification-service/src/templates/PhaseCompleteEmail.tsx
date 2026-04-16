import { Text } from '@react-email/components'
import React from 'react'

import { CtaButton, EmailLayout } from './common.js'

export function phaseCompleteSubject(props: { projectEmoji: string; phaseNumber: number; projectName: string }): string {
  return `${props.projectEmoji} Phase ${props.phaseNumber} Complete — ${props.projectName}`
}

export default function PhaseCompleteEmail(props: {
  name: string
  projectName: string
  projectEmoji: string
  phaseNumber: number
  phaseName: string
  nextPhaseName: string
  nextPhaseUrl: string
  highlights: string[]
}): React.ReactElement {
  return (
    <EmailLayout preview={`Your ${props.phaseName} phase is done. Time to ${props.nextPhaseName.toLowerCase()}!`}>
      <Text>Hi {props.name},</Text>
      <Text>Great progress on {props.projectName}!</Text>
      <Text>
        Phase {props.phaseNumber}: {props.phaseName} is complete.
      </Text>
      {props.highlights.map((h) => (
        <Text key={h}>- {h}</Text>
      ))}
      <CtaButton href={props.nextPhaseUrl} label={`Continue to ${props.nextPhaseName}`} />
    </EmailLayout>
  )
}
