import { http, HttpResponse } from 'msw'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'

export const handlers = [
  http.post(`${API_BASE}/auth/register`, async () =>
    HttpResponse.json({ data: { userId: 'test-id', message: 'Verification email sent' } }),
  ),
  http.post(`${API_BASE}/auth/verify-email`, async () => HttpResponse.json({ data: { verified: true } })),
  http.post(`${API_BASE}/auth/login`, async () =>
    HttpResponse.json({
      data: {
        user: { id: 'u1', email: 'test@example.com', name: 'Test User', role: 'user', plan: 'free' },
      },
    }),
  ),
  http.post(`${API_BASE}/auth/login/totp`, async () =>
    HttpResponse.json({
      data: {
        user: { id: 'u1', email: 'test@example.com', name: 'Test User', role: 'user', plan: 'free' },
      },
    }),
  ),
  http.post(`${API_BASE}/auth/logout`, async () => HttpResponse.json({ data: {} })),
  http.post(`${API_BASE}/auth/refresh`, async () => HttpResponse.json({ data: {} })),
  http.post(`${API_BASE}/auth/forgot-password`, async () => HttpResponse.json({ data: {} })),
  http.get(`${API_BASE}/auth/me`, async () =>
    HttpResponse.json({
      data: {
        id: 'u1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
        plan: 'free',
        onboardingDone: true,
      },
    }),
  ),
  http.get(`${API_BASE}/billing/token-usage`, async () =>
    HttpResponse.json({
      data: {
        tokensUsed: 1000,
        tokensLimit: 50000,
        tokensRemaining: 49000,
        percentUsed: 2,
        planTier: 'free',
        currentMonth: '2026-04',
        resetAt: new Date().toISOString(),
        isUnlimited: false,
        warningThresholds: [
          { percent: 80, triggered: false },
          { percent: 95, triggered: false },
        ],
      },
    }),
  ),
  http.patch(`${API_BASE}/users/profile`, async () => HttpResponse.json({ data: { updated: true } })),
  http.post(`${API_BASE}/projects`, async () => HttpResponse.json({ data: { id: 'project-1' } })),
  http.post(`${API_BASE}/billing/checkout`, async () =>
    HttpResponse.json({ data: { checkoutUrl: 'https://checkout.stripe.com/test' } }),
  ),
]
