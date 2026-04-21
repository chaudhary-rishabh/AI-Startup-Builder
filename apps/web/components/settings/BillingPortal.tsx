'use client'

import * as AlertDialog from '@radix-ui/react-alert-dialog'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PlanBadge, TokenUsageBar } from '@repo/ui'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'

import {
  cancelSubscription,
  createCheckoutSession,
  createTopUpOrder,
  getInvoices,
  getPlans,
  getSubscription,
  getTokenBudget,
  verifyTopUp,
} from '@/api/billing.api'
import { useAuthStore } from '@/store/authStore'

function formatInrPaise(paise: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(paise / 100)
}

function loadRazorpayScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  if ((window as unknown as { Razorpay?: unknown }).Razorpay) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Razorpay'))
    document.body.appendChild(script)
  })
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void }
  }
}

export function BillingPortal(): JSX.Element {
  const router = useRouter()
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState(false)

  const budgetQuery = useQuery({ queryKey: ['token-budget'], queryFn: getTokenBudget })
  const subQuery = useQuery({ queryKey: ['billing-subscription'], queryFn: getSubscription })
  const invoicesQuery = useQuery({ queryKey: ['billing-invoices'], queryFn: getInvoices })
  const plansQuery = useQuery({ queryKey: ['billing-plans'], queryFn: getPlans })

  const cancelMut = useMutation({
    mutationFn: cancelSubscription,
    onSuccess: async () => {
      setCancelOpen(false)
      await queryClient.invalidateQueries({ queryKey: ['billing-subscription'] })
      toast.success('Subscription will cancel at period end')
    },
  })

  const openSubscriptionCheckout = useCallback(
    async (plan: 'starter' | 'pro' | 'team', billingCycle: 'monthly' | 'yearly') => {
      setCheckoutLoading(true)
      try {
        await loadRazorpayScript()
        const { checkoutData } = await createCheckoutSession({ plan, billingCycle })
        const Razorpay = window.Razorpay
        if (!Razorpay) {
          toast.error('Razorpay failed to load')
          return
        }
        const rzp = new Razorpay({
          key: checkoutData.razorpayKeyId,
          subscription_id: checkoutData.subscriptionId,
          name: checkoutData.name,
          description: checkoutData.description,
          prefill: checkoutData.prefill,
          handler: () => {
            router.push('/settings/billing?success=1')
          },
          modal: {
            ondismiss: () => setCheckoutLoading(false),
          },
        })
        rzp.open()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Checkout failed')
      } finally {
        setCheckoutLoading(false)
      }
    },
    [router],
  )

  const openTopUp = useCallback(
    async (packName: 'starter_pack' | 'builder_pack' | 'studio_pack') => {
      setCheckoutLoading(true)
      try {
        await loadRazorpayScript()
        const order = await createTopUpOrder(packName)
        const Razorpay = window.Razorpay
        if (!Razorpay) {
          toast.error('Razorpay failed to load')
          return
        }
        const rzp = new Razorpay({
          key: order.razorpayKeyId,
          amount: order.amountPaise,
          currency: 'INR',
          order_id: order.orderId,
          name: 'AI Startup Builder',
          description: `Top-up — ${order.tokenGrant.toLocaleString()} tokens`,
          prefill: user
            ? { email: user.email, name: user.name }
            : { email: '', name: '' },
          handler: async (response: {
            razorpay_order_id: string
            razorpay_payment_id: string
            razorpay_signature: string
          }) => {
            try {
              await verifyTopUp({
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              })
              toast.success('✓ Credits added successfully!')
              await queryClient.invalidateQueries({ queryKey: ['token-budget'] })
            } catch (err) {
              toast.error(err instanceof Error ? err.message : 'Verification failed')
            }
          },
          modal: {
            ondismiss: () => setCheckoutLoading(false),
          },
        })
        rzp.open()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Top-up failed')
      } finally {
        setCheckoutLoading(false)
      }
    },
    [queryClient, user],
  )

  useEffect(() => {
    void loadRazorpayScript().catch(() => {})
  }, [])

  const budget = budgetQuery.data
  const sub = subQuery.data
  const invoices = invoicesQuery.data ?? []
  const plans = plansQuery.data ?? []

  const badgePlan: 'free' | 'pro' | 'enterprise' =
    sub?.planTier === 'free' ? 'free' : sub?.planTier === 'enterprise' ? 'enterprise' : 'pro'

  const usageLimit =
    budget && !budget.isUnlimited && budget.effectiveLimit > 0 ? budget.effectiveLimit : budget?.tokensLimit ?? 0

  return (
    <div className="space-y-8">
      <h1 className="font-display text-2xl text-heading">Billing</h1>

      {sub ? (
        <div className="rounded-card border border-divider bg-card p-6 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <PlanBadge plan={badgePlan} />
            <div>
              <p className="font-display text-xl text-heading capitalize">{sub.planTier} plan</p>
              <p className="text-xs text-muted">
                {sub.cancelAtPeriodEnd
                  ? `Cancels ${new Date(sub.currentPeriodEnd).toLocaleDateString()}`
                  : `Renews ${new Date(sub.currentPeriodEnd).toLocaleDateString()}`}
              </p>
            </div>
            <span
              className={`ml-auto rounded-full px-2 py-0.5 text-xs font-medium ${
                sub.status === 'active' ? 'bg-success-bg text-success' : sub.status === 'past_due' ? 'bg-amber-500/15 text-amber-700' : 'bg-error/10 text-error'
              }`}
            >
              {sub.status === 'active' ? 'Active' : sub.status === 'past_due' ? 'Past Due' : 'Cancelled'}
            </span>
          </div>
        </div>
      ) : null}

      {budget && !budget.isUnlimited ? (
        <div className="rounded-card border border-divider bg-card p-6 shadow-sm">
          <p className="text-sm font-medium text-heading">
            Token Usage — {budget.currentMonth}
          </p>
          <div className="mt-3">
            <TokenUsageBar used={budget.tokensUsed} limit={usageLimit} />
          </div>
          <p className="mt-2 text-xs text-muted">
            {budget.tokensUsed.toLocaleString()} / {budget.tokensLimit.toLocaleString()} tokens
            {budget.bonusTokens > 0 ? ` (+ ${budget.bonusTokens.toLocaleString()} bonus)` : ''}
            {budget.resetAt ? ` · Resets ${new Date(budget.resetAt).toLocaleDateString()}` : ''}
          </p>
        </div>
      ) : null}

      <div>
        <h2 className="font-display text-lg text-heading">Upgrade</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {plans
            .filter((p) => p.tier !== 'free')
            .map((plan) => {
              const current = plan.tier === sub?.planTier
              return (
                <div
                  key={plan.tier}
                  className={`rounded-card border bg-card p-4 shadow-sm ${current ? 'border-brand ring-1 ring-brand' : 'border-divider'}`}
                >
                  <p className="font-display text-lg text-heading">{plan.name}</p>
                  <p className="mt-1 text-sm text-muted">
                    {formatInrPaise(plan.priceMonthlyPaise)}/mo · {plan.tokenLimit.toLocaleString()} tokens
                  </p>
                  <ul className="mt-2 list-inside list-disc text-xs text-muted">
                    {plan.features.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                  {current ? (
                    <p className="mt-3 text-xs font-medium text-brand">Current plan</p>
                  ) : (
                    <button
                      type="button"
                      disabled={checkoutLoading}
                      className="mt-3 w-full rounded-md border border-brand py-2 text-sm font-medium text-brand hover:bg-brand/10 disabled:opacity-50"
                      onClick={() => void openSubscriptionCheckout(plan.tier as 'starter' | 'pro' | 'team', 'monthly')}
                    >
                      Upgrade
                    </button>
                  )}
                </div>
              )
            })}
        </div>
      </div>

      <div>
        <h2 className="font-display text-lg text-heading">Billing history</h2>
        {invoices.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No invoices yet</p>
        ) : (
          <div className="mt-4 overflow-hidden rounded-card border border-divider">
            <table className="w-full text-left text-sm">
              <thead className="bg-bg text-xs uppercase text-muted">
                <tr>
                  <th className="px-4 py-2">Date</th>
                  <th className="px-4 py-2">Amount</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Invoice</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-t border-divider">
                    <td className="px-4 py-2 text-muted">{new Date(inv.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-2 text-heading">{formatInrPaise(inv.amountPaid)}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          inv.status === 'paid' || inv.status === 'succeeded'
                            ? 'bg-success-bg text-success'
                            : 'bg-amber-500/15 text-amber-700'
                        }`}
                      >
                        {inv.status === 'paid' || inv.status === 'succeeded' ? 'Paid' : 'Open'}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <a
                        href={inv.hostedInvoiceUrl ?? inv.pdfUrl ?? '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand hover:underline"
                      >
                        PDF ↗
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-card border border-divider bg-card p-6 shadow-sm">
        <h2 className="font-display text-lg text-heading">Run out of credits? Add more anytime.</h2>
        <div className="mt-4 flex flex-col gap-4 md:flex-row">
          <div className="flex flex-1 flex-col rounded-card border border-divider p-4">
            <p className="font-medium text-heading">Starter Pack</p>
            <p className="text-sm text-muted">100,000 tokens · 199</p>
            <button
              type="button"
              disabled={checkoutLoading}
              className="mt-3 rounded-md border border-brand py-2 text-sm font-medium text-brand hover:bg-brand/10 disabled:opacity-50"
              onClick={() => void openTopUp('starter_pack')}
            >
              Buy Now
            </button>
          </div>
          <div className="relative flex flex-1 flex-col rounded-card border border-brand p-4 ring-1 ring-brand">
            <span className="absolute right-2 top-2 rounded-full bg-brand px-2 py-0.5 text-[10px] font-medium text-white">
              Most Popular
            </span>
            <p className="font-medium text-heading">Builder Pack</p>
            <p className="text-sm text-muted">500,000 tokens · 799</p>
            <button
              type="button"
              disabled={checkoutLoading}
              className="mt-3 rounded-md border border-brand py-2 text-sm font-medium text-brand hover:bg-brand/10 disabled:opacity-50"
              onClick={() => void openTopUp('builder_pack')}
            >
              Buy Now
            </button>
          </div>
          <div className="flex flex-1 flex-col rounded-card border border-divider p-4">
            <p className="font-medium text-heading">Studio Pack</p>
            <p className="text-sm text-muted">2,000,000 tokens · 2,499</p>
            <button
              type="button"
              disabled={checkoutLoading}
              className="mt-3 rounded-md border border-brand py-2 text-sm font-medium text-brand hover:bg-brand/10 disabled:opacity-50"
              onClick={() => void openTopUp('studio_pack')}
            >
              Buy Now
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          data-testid="manage-billing-btn"
          className="rounded-md border border-brand px-4 py-2 text-sm font-medium text-brand hover:bg-brand/10"
          onClick={() => router.push('/settings/billing')}
        >
          Manage Billing →
        </button>
        <button type="button" className="text-xs text-muted underline" onClick={() => setCancelOpen(true)}>
          Cancel Plan
        </button>
      </div>

      <AlertDialog.Root open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
          <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(400px,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-panel border border-divider bg-card p-6 shadow-lg">
            <AlertDialog.Title className="text-heading">Cancel subscription?</AlertDialog.Title>
            <AlertDialog.Description className="mt-2 text-sm text-muted">Your plan will remain active until the end of the billing period.</AlertDialog.Description>
            <div className="mt-4 flex justify-end gap-2">
              <AlertDialog.Cancel className="rounded-md border border-divider px-3 py-2 text-sm">Back</AlertDialog.Cancel>
              <AlertDialog.Action className="rounded-md bg-error px-3 py-2 text-sm font-medium text-white" onClick={() => void cancelMut.mutateAsync()}>
                Confirm cancel
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </div>
  )
}
