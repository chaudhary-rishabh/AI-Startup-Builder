import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import React from 'react'

import { env } from '../config/env.js'

export function EmailLayout(props: { preview: string; children: React.ReactNode }): React.ReactElement {
  return (
    <Html lang="en">
      <Head />
      <Preview>{props.preview}</Preview>
      <Body style={{ fontFamily: 'Arial, sans-serif', backgroundColor: '#f8fafc', color: '#0f172a' }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
          <Section style={{ backgroundColor: '#1B3A6B', color: '#ffffff', padding: '16px 20px' }}>
            <Text style={{ margin: 0, fontWeight: 700 }}>{env.APP_NAME}</Text>
          </Section>
          <Section style={{ backgroundColor: '#ffffff', padding: '20px', border: '1px solid #e2e8f0' }}>
            {props.children}
            <Hr />
            <Text style={{ color: '#64748b', fontSize: '12px' }}>
              You are receiving this email from {env.APP_NAME}. Manage preferences in your account.
            </Text>
            <Text style={{ color: '#64748b', fontSize: '12px' }}>
              <Link href={env.APP_URL}>{env.APP_URL}</Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export function CtaButton(props: { href: string; label: string }): React.ReactElement {
  return (
    <Button
      href={props.href}
      style={{
        backgroundColor: '#0D7377',
        color: '#ffffff',
        padding: '12px 18px',
        borderRadius: '6px',
        textDecoration: 'none',
      }}
    >
      {props.label}
    </Button>
  )
}
