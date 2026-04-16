import './env-setup.js'

import Redis from 'ioredis-mock'
import { beforeEach, vi } from 'vitest'

import { getRedis, setRedisForTests } from '../src/lib/redis.js'

setRedisForTests(new Redis() as never)
beforeEach(async () => {
  await getRedis().flushall()
})

const stripeState = {
  customers: new Map<string, { id: string; email?: string; name?: string }>(),
  sessions: [] as Array<{ id: string; url: string }>,
}

vi.mock('stripe', () => {
  class StripeMock {
    public errors = {
      StripeError: class StripeError extends Error {
        type: string
        statusCode?: number
        raw?: { statusCode?: number }
        constructor(message: string, type: string, statusCode?: number) {
          super(message)
          this.type = type
          this.statusCode = statusCode
          this.raw = { statusCode }
        }
      },
    }

    customers = {
      retrieve: vi.fn(async (id: string) => {
        const c = stripeState.customers.get(id)
        if (!c) throw new Error('not found')
        return c
      }),
      create: vi.fn(async (input: { email: string; name: string }) => {
        const id = `cus_${Math.random().toString(36).slice(2, 10)}`
        const c = { id, email: input.email, name: input.name }
        stripeState.customers.set(id, c)
        return c
      }),
    }

    coupons = {
      create: vi.fn(async (_input: Record<string, unknown>) => ({
        id: `coupon_${Math.random().toString(36).slice(2, 8)}`,
      })),
    }

    checkout = {
      sessions: {
        create: vi.fn(async (_input: Record<string, unknown>) => {
          const session = {
            id: `cs_${Math.random().toString(36).slice(2, 8)}`,
            url: 'https://checkout.stripe.test/session',
          }
          stripeState.sessions.push(session)
          return session
        }),
      },
    }

    billingPortal = {
      sessions: {
        create: vi.fn(async (_input: Record<string, unknown>) => ({
          id: `bps_${Math.random().toString(36).slice(2, 8)}`,
          url: 'https://billing.stripe.test/portal',
        })),
      },
    }

    subscriptions = {
      update: vi.fn(async (id: string, input: Record<string, unknown>) => ({
        id,
        ...input,
      })),
    }

    invoices = {
      list: vi.fn(async (_input: Record<string, unknown>) => ({
        data: [
          {
            id: 'in_1',
            number: '0001',
            amount_paid: 2900,
            currency: 'usd',
            status: 'paid',
            period_start: 1735689600,
            period_end: 1738368000,
            invoice_pdf: 'https://example.com/invoice.pdf',
            hosted_invoice_url: 'https://example.com/hosted',
            created: 1735689600,
          },
        ],
      })),
    }

    refunds = {
      create: vi.fn(async (input: Record<string, unknown>) => ({
        id: 're_1',
        ...input,
      })),
    }

    webhooks = {
      constructEvent: vi.fn((_payload: Buffer, signature: string) => {
        if (signature !== 'sig_ok') throw new Error('bad sig')
        return { id: 'evt_1', type: 'invoice.paid' }
      }),
    }

    constructor(_apiKey: string, _opts: unknown) {
      // noop
    }
  }

  return { default: StripeMock }
})
