'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import * as Popover from '@radix-ui/react-popover'
import { Eye, EyeOff, Loader2, Check } from 'lucide-react'
import type {
  EmailSettings as EmailSettingsType,
  EmailTemplatePreview,
  EmailTemplateKey,
} from '@/types'
import { sendTestEmail } from '@/lib/api/settings.api'
import { cn } from '@/lib/cn'
import { toast } from 'sonner'

const providers = ['resend', 'sendgrid', 'smtp'] as const

const buildSchema = () =>
  z
    .object({
      provider: z.enum(providers),
      apiKey: z.string(),
      fromEmail: z.string().email('Invalid email'),
      fromName: z.string().min(1, 'Required'),
      smtpHost: z.string().optional(),
      smtpPort: z.coerce.number().optional(),
      smtpUsername: z.string().optional(),
      smtpPassword: z.string().optional(),
    })
    .superRefine((data, ctx) => {
      if (data.provider !== 'smtp') return
      if (!data.smtpHost?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'SMTP host is required',
          path: ['smtpHost'],
        })
      }
      if (data.smtpPort == null || Number.isNaN(data.smtpPort)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'SMTP port is required',
          path: ['smtpPort'],
        })
      }
      if (!data.smtpUsername?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'SMTP username is required',
          path: ['smtpUsername'],
        })
      }
      if (!data.smtpPassword?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'SMTP password is required',
          path: ['smtpPassword'],
        })
      }
    })

interface EmailSettingsProps {
  settings: EmailSettingsType | undefined
  templates: EmailTemplatePreview[]
  isLoading: boolean
  onSave: (payload: Partial<EmailSettingsType>) => Promise<void>
}

export function EmailSettings({
  settings,
  templates,
  isLoading,
  onSave,
}: EmailSettingsProps) {
  const [showKey, setShowKey] = useState(false)
  const [showSmtpPass, setShowSmtpPass] = useState(false)
  const [keyDirty, setKeyDirty] = useState(false)
  const [smtpPassDirty, setSmtpPassDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<z.infer<ReturnType<typeof buildSchema>>>({
    resolver: zodResolver(buildSchema()),
    defaultValues: {
      provider: 'resend',
      apiKey: '',
      fromEmail: '',
      fromName: '',
      smtpHost: '',
      smtpPort: 587,
      smtpUsername: '',
      smtpPassword: '',
    },
  })

  const provider = watch('provider')

  useEffect(() => {
    if (!settings) return
    setKeyDirty(false)
    setSmtpPassDirty(false)
    reset({
      provider: settings.provider,
      apiKey: settings.apiKey,
      fromEmail: settings.fromEmail,
      fromName: settings.fromName,
      smtpHost: settings.smtpHost ?? '',
      smtpPort: settings.smtpPort ?? 587,
      smtpUsername: settings.smtpUsername ?? '',
      smtpPassword: settings.smtpPassword ?? '',
    })
  }, [settings, reset])

  const onSubmit = async (values: z.infer<ReturnType<typeof buildSchema>>) => {
    setSaving(true)
    try {
      const payload: Partial<EmailSettingsType> = {
        provider: values.provider,
        fromEmail: values.fromEmail,
        fromName: values.fromName,
      }
      if (keyDirty) payload.apiKey = values.apiKey
      if (values.provider === 'smtp') {
        payload.smtpHost = values.smtpHost
        payload.smtpPort = values.smtpPort
        payload.smtpUsername = values.smtpUsername
        if (smtpPassDirty) payload.smtpPassword = values.smtpPassword
      }
      await onSave(payload)
      setSavedFlash(true)
      setTimeout(() => setSavedFlash(false), 3000)
      setKeyDirty(false)
      setSmtpPassDirty(false)
    } finally {
      setSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="bg-card rounded-card shadow-sm p-6 space-y-4">
        <div className="h-9 w-48 shimmer rounded-chip" />
        <div className="h-11 w-full shimmer rounded-card" />
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 shimmer rounded-card" />
          ))}
        </div>
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="bg-card rounded-card shadow-sm p-6 text-sm text-muted">
        Email settings could not be loaded.
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="bg-card rounded-card shadow-sm p-6 space-y-6"
    >
      <div>
        <p className="text-sm font-medium text-heading mb-2">Provider</p>
        <div className="flex flex-wrap gap-2">
          {providers.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setValue('provider', p)}
              className={cn(
                'rounded-chip px-3 py-1.5 text-sm font-medium capitalize transition-colors',
                provider === p
                  ? 'bg-brand text-white'
                  : 'border border-divider text-muted hover:text-heading',
              )}
            >
              {p === 'smtp' ? 'SMTP' : p === 'resend' ? 'Resend' : 'SendGrid'}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-heading mb-1.5">
          API Key
        </label>
        <div className="relative max-w-md">
          <input
            type={showKey ? 'text' : 'password'}
            {...register('apiKey')}
            onFocus={() => {
              if (!keyDirty && settings.apiKey.includes('•')) {
                setKeyDirty(true)
                setValue('apiKey', '')
              }
            }}
            className="h-11 w-full rounded-card border border-divider pr-10 pl-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand"
          />
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-heading"
            onClick={() => setShowKey((s) => !s)}
            aria-label={showKey ? 'Hide API key' : 'Show API key'}
          >
            {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <p className="mt-1 text-[11px] text-muted">
          Never displayed in full after saving
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-heading mb-1.5">
            From Email
          </label>
          <input
            type="email"
            {...register('fromEmail')}
            className="h-11 w-full rounded-card border border-divider px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          />
          {errors.fromEmail && (
            <p className="mt-1 text-xs text-error">{errors.fromEmail.message}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-heading mb-1.5">
            From Name
          </label>
          <input
            {...register('fromName')}
            className="h-11 w-full rounded-card border border-divider px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          />
          {errors.fromName && (
            <p className="mt-1 text-xs text-error">{errors.fromName.message}</p>
          )}
        </div>
      </div>

      {provider === 'smtp' ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-heading mb-1.5">
              SMTP Host
            </label>
            <input
              {...register('smtpHost')}
              className="h-11 w-full rounded-card border border-divider px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            />
            {errors.smtpHost && (
              <p className="mt-1 text-xs text-error">{errors.smtpHost.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-heading mb-1.5">
              SMTP Port
            </label>
            <input
              type="number"
              {...register('smtpPort')}
              className="h-11 w-full rounded-card border border-divider px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            />
            {errors.smtpPort && (
              <p className="mt-1 text-xs text-error">{errors.smtpPort.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-heading mb-1.5">
              SMTP Username
            </label>
            <input
              {...register('smtpUsername')}
              className="h-11 w-full rounded-card border border-divider px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            />
            {errors.smtpUsername && (
              <p className="mt-1 text-xs text-error">
                {errors.smtpUsername.message}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-heading mb-1.5">
              SMTP Password
            </label>
            <div className="relative">
              <input
                type={showSmtpPass ? 'text' : 'password'}
                {...register('smtpPassword')}
                onFocus={() => {
                  if (
                    !smtpPassDirty &&
                    (settings.smtpPassword?.includes('•') ||
                      (settings.smtpPassword && settings.smtpPassword.length > 0))
                  ) {
                    setSmtpPassDirty(true)
                    setValue('smtpPassword', '')
                  }
                }}
                className="h-11 w-full rounded-card border border-divider pr-10 pl-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-heading"
                onClick={() => setShowSmtpPass((s) => !s)}
              >
                {showSmtpPass ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.smtpPassword && (
              <p className="mt-1 text-xs text-error">
                {errors.smtpPassword.message}
              </p>
            )}
          </div>
        </div>
      ) : null}

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
          'Save Email Settings'
        )}
      </button>

      <div className="border-t border-divider pt-6">
        <h3 className="text-sm font-semibold text-heading mb-3">Email Templates</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <TemplateCard key={t.key} template={t} />
          ))}
        </div>
      </div>
    </form>
  )
}

function TemplateCard({ template }: { template: EmailTemplatePreview }) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const preview =
    template.previewText.length > 60
      ? `${template.previewText.slice(0, 60)}…`
      : template.previewText

  const send = async () => {
    if (!email.trim()) return
    setSending(true)
    try {
      await sendTestEmail(template.key as EmailTemplateKey, email.trim())
      toast.success(`Test email sent to ${email.trim()}`)
      setOpen(false)
      setEmail('')
    } catch {
      toast.error('Could not send test email')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="bg-output rounded-card p-3 flex flex-col gap-2">
      <span className="inline-block self-start rounded-chip bg-bg px-1.5 py-0.5 font-mono text-[11px] text-heading">
        {template.key}
      </span>
      <p className="text-[13px] font-medium text-heading leading-snug">
        {template.subject}
      </p>
      <p className="text-[12px] text-muted line-clamp-2">{preview}</p>
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <button
            type="button"
            className="mt-auto self-start rounded-chip border border-divider bg-white px-2 py-1 text-xs font-medium text-heading hover:bg-bg"
          >
            Send Test
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            className="z-50 w-72 rounded-card border border-divider bg-white p-3 shadow-md"
            sideOffset={6}
          >
            <p className="text-xs font-medium text-heading mb-2">Send test to:</p>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="mb-2 h-9 w-full rounded-card border border-divider px-2 text-sm"
            />
            <button
              type="button"
              disabled={sending}
              onClick={() => void send()}
              className="h-8 w-full rounded-card bg-brand text-xs font-semibold text-white hover:opacity-95 disabled:opacity-70"
            >
              {sending ? 'Sending…' : 'Send'}
            </button>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  )
}
