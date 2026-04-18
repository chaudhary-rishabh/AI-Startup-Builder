'use client'

import * as AlertDialog from '@radix-ui/react-alert-dialog'
import { useState } from 'react'
import { toast } from 'sonner'

type IntegrationId = 'notion' | 'github' | 'figma' | 'vercel' | 'posthog' | 'ga'

const items: Array<{
  id: IntegrationId
  name: string
  description: string
  githubAs?: boolean
}> = [
  { id: 'notion', name: 'Notion', description: 'Sync PRDs and research docs.' },
  { id: 'github', name: 'GitHub', description: 'Connect repositories for CI/CD.', githubAs: true },
  { id: 'figma', name: 'Figma', description: 'Import frames and design tokens.' },
  { id: 'vercel', name: 'Vercel', description: 'Deploy frontends with preview URLs.' },
  { id: 'posthog', name: 'PostHog', description: 'Product analytics and session replay.' },
  { id: 'ga', name: 'Google Analytics', description: 'Traffic and conversion reporting.' },
]

export function IntegrationsGrid(): JSX.Element {
  const [connected, setConnected] = useState<Record<IntegrationId, boolean>>({
    notion: false,
    github: false,
    figma: false,
    vercel: false,
    posthog: false,
    ga: false,
  })
  const [githubUser] = useState('@alexbuilder')
  const [pendingDisconnect, setPendingDisconnect] = useState<IntegrationId | null>(null)

  const toggleConnect = (id: IntegrationId, next: boolean): void => {
    setConnected((c) => ({ ...c, [id]: next }))
    toast.message(next ? 'Integration connected (demo mode)' : 'Disconnected')
  }

  return (
    <div>
      <h1 className="font-display text-2xl text-heading">Integrations</h1>
      <p className="mt-1 text-sm text-muted">Connect the tools you already use.</p>
      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const isOn = connected[item.id]
          return (
            <div key={item.id} className="rounded-card border border-divider bg-card p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-heading">{item.name}</p>
                  <p className="mt-1 text-xs text-muted">{item.description}</p>
                  {item.githubAs && isOn ? <p className="mt-2 text-xs text-muted">Connected as {githubUser}</p> : null}
                </div>
                <span className="flex items-center gap-1 text-[11px] text-muted">
                  <span className={`h-2 w-2 rounded-full ${isOn ? 'bg-success' : 'bg-muted'}`} />
                  {isOn ? 'Connected' : 'Not connected'}
                </span>
              </div>
              {isOn ? (
                <button
                  type="button"
                  className="mt-4 w-full rounded-md border border-error py-2 text-xs font-medium text-error hover:bg-error/5"
                  onClick={() => setPendingDisconnect(item.id)}
                >
                  Disconnect
                </button>
              ) : (
                <button
                  type="button"
                  className="mt-4 w-full rounded-md border border-brand py-2 text-xs font-medium text-brand hover:bg-brand/10"
                  onClick={() => toggleConnect(item.id, true)}
                >
                  Connect
                </button>
              )}
            </div>
          )
        })}
      </div>

      <AlertDialog.Root open={Boolean(pendingDisconnect)} onOpenChange={(open: boolean) => !open && setPendingDisconnect(null)}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
          <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(400px,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-panel border border-divider bg-card p-6 shadow-lg">
            <AlertDialog.Title className="text-heading">Disconnect integration?</AlertDialog.Title>
            <AlertDialog.Description className="mt-2 text-sm text-muted">You can reconnect at any time.</AlertDialog.Description>
            <div className="mt-4 flex justify-end gap-2">
              <AlertDialog.Cancel className="rounded-md border border-divider px-3 py-2 text-sm">Cancel</AlertDialog.Cancel>
              <AlertDialog.Action
                className="rounded-md bg-error px-3 py-2 text-sm font-medium text-white"
                onClick={() => {
                  if (pendingDisconnect) toggleConnect(pendingDisconnect, false)
                  setPendingDisconnect(null)
                }}
              >
                Disconnect
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </div>
  )
}
