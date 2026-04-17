'use client'

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useState } from 'react'

import { GoogleOAuthButton } from '@/components/auth/GoogleOAuthButton'
import { LoginForm } from '@/components/auth/LoginForm'
import { SignUpForm } from '@/components/auth/SignUpForm'

type AuthTab = 'signup' | 'login'

export function AuthCard(): JSX.Element {
  const [activeTab, setActiveTab] = useState<AuthTab>('signup')
  const reduceMotion = useReducedMotion()

  const transition = reduceMotion ? { duration: 0 } : { duration: 0.15, ease: 'easeOut' }

  return (
    <div className="mx-auto w-full max-w-md rounded-card bg-card p-10 shadow-md">
      <div className="mb-6 flex border-b border-divider">
        <button
          type="button"
          onClick={() => setActiveTab('signup')}
          className={`pb-2 pr-6 text-sm font-semibold ${
            activeTab === 'signup' ? 'border-b-2 border-brand text-heading' : 'text-muted'
          }`}
        >
          Sign Up
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('login')}
          className={`pb-2 text-sm font-semibold ${
            activeTab === 'login' ? 'border-b-2 border-brand text-heading' : 'text-muted'
          }`}
        >
          Log In
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'signup' ? (
          <motion.div
            key="signup"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={transition}
          >
            <SignUpForm />
          </motion.div>
        ) : (
          <motion.div
            key="login"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={transition}
          >
            <LoginForm />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="my-5 flex items-center gap-2">
        <div className="h-px flex-1 bg-divider" />
        <p className="text-xs text-muted">or continue with</p>
        <div className="h-px flex-1 bg-divider" />
      </div>

      <GoogleOAuthButton />
    </div>
  )
}
