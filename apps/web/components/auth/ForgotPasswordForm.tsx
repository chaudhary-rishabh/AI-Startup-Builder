'use client'

import { useState } from 'react'
import type { FormEvent } from 'react'

import { forgotPassword } from '@/api/auth.api'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'

interface ForgotPasswordFormProps {
  initialEmail?: string
  onBack: () => void
}

export function ForgotPasswordForm({ initialEmail = '', onBack }: ForgotPasswordFormProps): JSX.Element {
  const [email, setEmail] = useState(initialEmail)
  const [isLoading, setIsLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    setIsLoading(true)
    try {
      await forgotPassword(email)
      setSent(true)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted">Enter your email to receive a reset link</p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          className="h-11 w-full rounded-md border border-divider bg-card px-3 text-sm text-heading"
          placeholder="you@example.com"
        />
        <button
          type="submit"
          disabled={isLoading}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-brand px-4 text-sm font-semibold text-white transition hover:brightness-90 disabled:opacity-70"
        >
          {isLoading ? <LoadingSpinner className="text-white" /> : null}
          Send Reset Link →
        </button>
      </form>
      {sent ? <p className="text-xs text-success">Check your email for a reset link.</p> : null}
      <button type="button" onClick={onBack} className="text-xs text-muted underline underline-offset-2">
        ← Back to sign in
      </button>
    </div>
  )
}
