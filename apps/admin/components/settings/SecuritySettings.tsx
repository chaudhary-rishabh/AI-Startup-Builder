'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import * as Switch from '@radix-ui/react-switch'
import { Loader2, Check } from 'lucide-react'
import type { SecuritySettings as SecuritySettingsType } from '@/types'
import { invalidateAdminSessions } from '@/lib/api/settings.api'
import { ConfirmModal } from '@/components/common/ConfirmModal'
import { cn } from '@/lib/cn'
import { toast } from 'sonner'

const ipRegex = /^[\d./]+$/

const schema = z.object({
  force2FAForAdmins: z.boolean(),
  sessionTimeoutMinutes: z.coerce
    .number()
    .min(5)
    .max(1440),
  maxLoginAttempts: z.coerce.number().min(2).max(10),
  lockoutDurationMinutes: z.coerce.number().min(1),
  apiRateLimitPerMinute: z.coerce.number().min(1),
})

type FormValues = z.infer<typeof schema>

interface SecuritySettingsProps {
  settings: SecuritySettingsType | undefined
  isLoading: boolean
  onSave: (payload: Partial<SecuritySettingsType>) => Promise<void>
}

export function SecuritySettings({
  settings,
  isLoading,
  onSave,
}: SecuritySettingsProps) {
  const [ipDraft, setIpDraft] = useState('')
  const [allowlist, setAllowlist] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const [confirm2faOpen, setConfirm2faOpen] = useState(false)
  const [invalidateOpen, setInvalidateOpen] = useState(false)
  const [invalidateLoading, setInvalidateLoading] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      force2FAForAdmins: false,
      sessionTimeoutMinutes: 60,
      maxLoginAttempts: 3,
      lockoutDurationMinutes: 15,
      apiRateLimitPerMinute: 100,
    },
  })

  const force2fa = watch('force2FAForAdmins')

  useEffect(() => {
    if (!settings) return
    reset({
      force2FAForAdmins: settings.force2FAForAdmins,
      sessionTimeoutMinutes: settings.sessionTimeoutMinutes,
      maxLoginAttempts: settings.maxLoginAttempts,
      lockoutDurationMinutes: settings.lockoutDurationMinutes,
      apiRateLimitPerMinute: settings.apiRateLimitPerMinute,
    })
    setAllowlist(settings.ipAllowlist ?? [])
  }, [settings, reset])

  const onSubmit = async (values: FormValues) => {
    setSaving(true)
    try {
      await onSave({
        ...values,
        ipAllowlist: allowlist,
      })
      setSavedFlash(true)
      setTimeout(() => setSavedFlash(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  const addIp = () => {
    const v = ipDraft.trim()
    if (!v) return
    if (!ipRegex.test(v)) {
      toast.error('Enter a valid CIDR range (e.g. 203.0.113.0/24)')
      return
    }
    if (allowlist.includes(v)) {
      setIpDraft('')
      return
    }
    setAllowlist((a) => [...a, v])
    setIpDraft('')
  }

  const removeIp = (ip: string) => {
    setAllowlist((a) => a.filter((x) => x !== ip))
  }

  const handle2faToggle = (next: boolean) => {
    if (next) {
      setConfirm2faOpen(true)
      return
    }
    setValue('force2FAForAdmins', false)
  }

  const confirm2fa = () => {
    setValue('force2FAForAdmins', true)
    setConfirm2faOpen(false)
  }

  if (isLoading) {
    return (
      <div className="bg-card rounded-card shadow-sm p-6 space-y-4">
        <div className="h-8 w-1/2 shimmer rounded-card" />
        <div className="h-11 w-full shimmer rounded-card" />
        <div className="h-24 shimmer rounded-card" />
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="bg-card rounded-card shadow-sm p-6 text-sm text-muted">
        Security settings could not be loaded.
      </div>
    )
  }

  return (
    <>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="bg-card rounded-card shadow-sm p-6 space-y-8"
      >
        <section>
          <h3 className="text-sm font-semibold text-heading mb-4">
            Authentication
          </h3>
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <p className="text-sm font-medium text-heading">
                Force 2FA for all admins
              </p>
              <p className="text-[11px] text-muted">
                Require two-factor authentication for every admin account
              </p>
            </div>
            <Switch.Root
              checked={force2fa}
              onCheckedChange={handle2faToggle}
              className={cn(
                'relative h-12 w-[88px] shrink-0 rounded-full transition-colors',
                force2fa ? 'bg-brand' : 'bg-divider',
              )}
            >
              <Switch.Thumb
                className={cn(
                  'block h-10 w-10 translate-x-1 translate-y-1 rounded-full bg-white shadow transition-transform',
                  force2fa && 'translate-x-[44px]',
                )}
              />
            </Switch.Root>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-heading mb-1.5">
                Session timeout (minutes)
              </label>
              <input
                type="number"
                {...register('sessionTimeoutMinutes')}
                className="h-11 w-full rounded-card border border-divider px-3 text-sm"
              />
              {errors.sessionTimeoutMinutes && (
                <p className="mt-1 text-xs text-error">
                  {errors.sessionTimeoutMinutes.message}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-heading mb-1.5">
                Max login attempts
              </label>
              <input
                type="number"
                {...register('maxLoginAttempts')}
                className="h-11 w-full rounded-card border border-divider px-3 text-sm"
              />
              {errors.maxLoginAttempts && (
                <p className="mt-1 text-xs text-error">
                  {errors.maxLoginAttempts.message}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-heading mb-1.5">
                Lockout duration (minutes)
              </label>
              <input
                type="number"
                {...register('lockoutDurationMinutes')}
                className="h-11 w-full rounded-card border border-divider px-3 text-sm"
              />
            </div>
          </div>
        </section>

        <section className="border-t border-divider pt-6">
          <h3 className="text-sm font-semibold text-heading mb-1">
            Admin IP Allowlist
          </h3>
          <p className="text-[12px] text-muted mb-3">
            Leave empty to allow all IPs. Add CIDR ranges to restrict /admin
            access.
          </p>
          <div className="flex flex-wrap gap-2 mb-2">
            <input
              value={ipDraft}
              onChange={(e) => setIpDraft(e.target.value)}
              placeholder="e.g. 203.0.113.0/24"
              className="h-11 flex-1 min-w-[200px] rounded-card border border-divider px-3 text-sm"
            />
            <button
              type="button"
              onClick={addIp}
              className="h-11 rounded-card border border-divider bg-white px-4 text-sm font-medium hover:bg-bg"
            >
              + Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2 mb-2">
            {allowlist.map((ip) => (
              <span
                key={ip}
                className="inline-flex items-center gap-1 rounded-chip bg-bg px-2 py-1 font-mono text-xs"
              >
                {ip}
                <button
                  type="button"
                  className="text-muted hover:text-heading"
                  onClick={() => removeIp(ip)}
                  aria-label={`Remove ${ip}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-card p-2">
            Changes take effect immediately. Ensure your current IP is listed.
          </p>
        </section>

        <section className="border-t border-divider pt-6">
          <h3 className="text-sm font-semibold text-heading mb-1">
            Rate limiting
          </h3>
          <label className="block text-sm font-medium text-heading mb-1.5">
            API Rate Limit (per user, per minute)
          </label>
          <input
            type="number"
            {...register('apiRateLimitPerMinute')}
            className="h-11 max-w-xs rounded-card border border-divider px-3 text-sm"
          />
          <p className="mt-1 text-[11px] text-muted">
            Applied to all API endpoints platform-wide
          </p>
          {errors.apiRateLimitPerMinute && (
            <p className="mt-1 text-xs text-error">
              {errors.apiRateLimitPerMinute.message}
            </p>
          )}
        </section>

        <button
          type="submit"
          disabled={saving}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-card bg-brand text-sm font-semibold text-white hover:opacity-95 disabled:opacity-70"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : savedFlash ? (
            <>
              <Check className="h-4 w-4 text-green-200" />
              Saved!
            </>
          ) : (
            'Save Security Settings'
          )}
        </button>
      </form>

      <div className="mt-6 border-t border-divider pt-6">
        <div className="bg-red-50 border border-red-200 rounded-card p-5">
          <h3 className="text-error font-semibold text-sm mb-4">Danger Zone</h3>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-heading">
                Invalidate all admin sessions
              </p>
              <p className="text-[12px] text-muted mt-1">
                Force all admins to re-authenticate immediately
              </p>
            </div>
            <button
              type="button"
              onClick={() => setInvalidateOpen(true)}
              className="h-9 shrink-0 rounded-card border border-error px-4 text-sm font-semibold text-error hover:bg-red-100"
            >
              Invalidate All Sessions
            </button>
          </div>
        </div>
      </div>

      <ConfirmModal
        open={confirm2faOpen}
        onOpenChange={setConfirm2faOpen}
        title="Enable forced 2FA?"
        description="Enabling force 2FA will immediately lock out any admin without 2FA configured. They will receive an email with setup instructions."
        confirmLabel="Enable 2FA"
        variant="warning"
        onConfirm={() => {
          confirm2fa()
        }}
      />

      <ConfirmModal
        open={invalidateOpen}
        onOpenChange={setInvalidateOpen}
        title="Invalidate all sessions?"
        description="All admins will be signed out immediately."
        confirmLabel="Invalidate"
        variant="danger"
        isLoading={invalidateLoading}
        onConfirm={async () => {
          setInvalidateLoading(true)
          try {
            await invalidateAdminSessions()
            toast.success('All admin sessions have been invalidated')
            setInvalidateOpen(false)
          } catch {
            toast.error('Could not invalidate sessions')
          } finally {
            setInvalidateLoading(false)
          }
        }}
      />
    </>
  )
}
