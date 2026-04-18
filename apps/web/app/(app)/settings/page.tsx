'use client'

import { APIKeyManager } from '@/components/settings/APIKeyManager'
import { NotificationPrefs } from '@/components/settings/NotificationPrefs'
import { ProfileForm } from '@/components/settings/ProfileForm'

export default function SettingsPage(): JSX.Element {
  return (
    <div className="mx-auto max-w-2xl space-y-10 p-8">
      <ProfileForm />
      <APIKeyManager />
      <NotificationPrefs />
    </div>
  )
}
