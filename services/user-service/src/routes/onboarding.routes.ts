import { CompleteOnboardingStepSchema } from '@repo/validators'
import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'

import * as onboardingQueries from '../db/queries/onboarding.queries.js'
import { publishUserOnboardingCompleted } from '../events/publisher.js'
import { err, ok } from '../lib/response.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { completeAuthOnboarding } from '../services/authClient.service.js'

const STEP_ORDER = ['profile', 'idea', 'plan'] as const
type OnboardingStep = (typeof STEP_ORDER)[number]

function stepIndex(step: OnboardingStep): number {
  return STEP_ORDER.indexOf(step)
}

function nextAfter(step: OnboardingStep): 'idea' | 'plan' | 'complete' {
  if (step === 'profile') return 'idea'
  if (step === 'idea') return 'plan'
  return 'complete'
}

const onboarding = new Hono()

onboarding.get('/me/onboarding', requireAuth, async (c) => {
  const userId = c.get('userId' as never) as string
  let state = await onboardingQueries.findOnboardingByUserId(userId)
  if (!state) {
    state = await onboardingQueries.createOnboardingState(userId)
  }

  const completed = (state.completedSteps as string[]) ?? []
  return ok(c, {
    currentStep: state.currentStep,
    completedSteps: completed,
    totalSteps: 3,
    isComplete: state.currentStep === 'complete',
    stepData: state.stepData as Record<string, unknown>,
  })
})

onboarding.post(
  '/me/onboarding/complete',
  requireAuth,
  zValidator('json', CompleteOnboardingStepSchema, (r) => {
    if (!r.success) throw r.error
  }),
  async (c) => {
    const userId = c.get('userId' as never) as string
    const requestId = c.get('requestId' as never) as string | undefined
    const body = c.req.valid('json')
    const step = body.step as OnboardingStep

    if (!STEP_ORDER.includes(step)) {
      return err(c, 422, 'VALIDATION_ERROR', 'Invalid step')
    }

    let state = await onboardingQueries.findOnboardingByUserId(userId)
    if (!state) {
      state = await onboardingQueries.createOnboardingState(userId)
    }

    if (state.currentStep === 'complete') {
      return err(c, 409, 'ONBOARDING_ALREADY_COMPLETE', 'Onboarding is already complete')
    }

    const completed = [...((state.completedSteps as string[]) ?? [])]
    const idx = stepIndex(step)
    if (idx !== completed.length) {
      const expected = STEP_ORDER[completed.length]
      return err(
        c,
        409,
        'ONBOARDING_STEP_OUT_OF_ORDER',
        `Cannot complete step ${step} before completing step ${expected ?? 'previous'}`,
      )
    }
    if (completed.includes(step)) {
      return err(c, 409, 'ONBOARDING_STEP_OUT_OF_ORDER', 'Step already completed')
    }

    const newCompleted = [...completed, step]
    const prevData = (state.stepData as Record<string, unknown>) ?? {}
    const newStepData = { ...prevData, [step]: body.data ?? {} }
    const nextStep = nextAfter(step)

    const updated = await onboardingQueries.updateOnboardingState(userId, {
      completedSteps: newCompleted,
      currentStep: nextStep,
      stepData: newStepData,
      completedAt: nextStep === 'complete' ? new Date() : null,
    })

    if (!updated) {
      return err(c, 500, 'INTERNAL_ERROR', 'Failed to update onboarding')
    }

    if (nextStep === 'complete') {
      try {
        await completeAuthOnboarding(userId, requestId)
      } catch (e) {
        console.error('[user-service] completeAuthOnboarding failed:', e)
      }
      try {
        await publishUserOnboardingCompleted(userId)
      } catch (e) {
        console.error('[user-service] publishUserOnboardingCompleted failed:', e)
      }
    }

    return ok(c, {
      currentStep: updated.currentStep,
      completedSteps: updated.completedSteps as string[],
      totalSteps: 3,
      isComplete: updated.currentStep === 'complete',
      stepData: updated.stepData as Record<string, unknown>,
    })
  },
)

export default onboarding
