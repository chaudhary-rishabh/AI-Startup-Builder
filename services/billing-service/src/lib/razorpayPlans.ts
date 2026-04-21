import { env } from '../config/env.js'
import { AppError } from './errors.js'

export function getRazorpayPlanId(planName: string, cycle: 'monthly' | 'yearly'): string {
  const plan = planName.toLowerCase()
  if (plan === 'free' || plan === 'enterprise') {
    throw new AppError('NO_PLAN_ID', 'Plan does not support Razorpay subscription checkout.', 422)
  }
  if (plan === 'starter') {
    return cycle === 'monthly' ? env.RAZORPAY_STARTER_MONTHLY_PLAN_ID : env.RAZORPAY_STARTER_YEARLY_PLAN_ID
  }
  if (plan === 'pro') {
    return cycle === 'monthly' ? env.RAZORPAY_PRO_MONTHLY_PLAN_ID : env.RAZORPAY_PRO_YEARLY_PLAN_ID
  }
  if (plan === 'team') {
    return cycle === 'monthly' ? env.RAZORPAY_TEAM_MONTHLY_PLAN_ID : env.RAZORPAY_TEAM_YEARLY_PLAN_ID
  }
  throw new AppError('PLAN_NOT_SUPPORTED', `Unsupported plan: ${planName}`, 422)
}
