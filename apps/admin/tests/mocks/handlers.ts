import { http, HttpResponse } from 'msw'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'

export const handlers = [
  http.post(`${BASE}/auth/admin/login`, async ({ request }) => {
    const body = (await request.json()) as Record<string, string>
    if (body['email'] === 'locked@admin.com') {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'ACCOUNT_LOCKED',
            message: 'Account locked',
            lockoutEndsAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
          },
        },
        { status: 423 },
      )
    }
    if (body['password'] === 'wrongpassword') {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password',
          },
        },
        { status: 401 },
      )
    }
    return HttpResponse.json({
      success: true,
      data: { requiresTotp: true, tempToken: 'temp_token_abc123' },
    })
  }),

  http.post(`${BASE}/auth/admin/verify-totp`, async ({ request }) => {
    const body = (await request.json()) as Record<string, string>
    if (body['totpCode'] === '000000') {
      return HttpResponse.json(
        {
          success: false,
          error: { code: 'INVALID_TOTP', message: 'Invalid code — try again' },
        },
        { status: 401 },
      )
    }
    return HttpResponse.json({
      success: true,
      data: {
        admin: {
          id: 'admin-1',
          email: 'admin@example.com',
          name: 'Super Admin',
          role: 'super_admin',
          avatarUrl: null,
          lastLoginAt: new Date().toISOString(),
        },
      },
    })
  }),

  http.post(`${BASE}/auth/admin/logout`, () =>
    HttpResponse.json({ success: true, data: {} }),
  ),

  http.post(`${BASE}/auth/admin/refresh`, () =>
    HttpResponse.json({ success: true, data: { expiresIn: 900 } }),
  ),

  http.get(`${BASE}/admin/kpis`, () =>
    HttpResponse.json({
      success: true,
      data: {
        totalUsers: 12847,
        activeToday: 1204,
        newThisWeek: 312,
        totalProjects: 34521,
        totalRevenueCents: 2480000,
        avgSessionMinutes: 28,
        changes: {
          totalUsers: 8.4,
          activeToday: 12.1,
          newThisWeek: -3.2,
          totalProjects: 11.7,
          totalRevenue: 14.3,
          avgSession: 2.1,
        },
      },
    }),
  ),

  http.get(`${BASE}/admin/revenue`, () =>
    HttpResponse.json({
      success: true,
      data: [
        {
          month: 'Jan 2025',
          mrr: 1800000,
          newMrr: 240000,
          churnedMrr: 42000,
        },
        {
          month: 'Feb 2025',
          mrr: 1920000,
          newMrr: 160000,
          churnedMrr: 40000,
        },
        {
          month: 'Mar 2025',
          mrr: 2040000,
          newMrr: 180000,
          churnedMrr: 60000,
        },
        {
          month: 'Apr 2025',
          mrr: 2160000,
          newMrr: 200000,
          churnedMrr: 80000,
        },
        {
          month: 'May 2025',
          mrr: 2280000,
          newMrr: 220000,
          churnedMrr: 100000,
        },
        {
          month: 'Jun 2025',
          mrr: 2480000,
          newMrr: 260000,
          churnedMrr: 60000,
        },
      ],
    }),
  ),

  http.get(`${BASE}/admin/user-growth`, () =>
    HttpResponse.json({
      success: true,
      data: [
        { week: 'Week of Mar 3', signups: 48, churned: 4 },
        { week: 'Week of Mar 10', signups: 71, churned: 6 },
        { week: 'Week of Mar 17', signups: 54, churned: 5 },
        { week: 'Week of Mar 24', signups: 89, churned: 8 },
        { week: 'Week of Mar 31', signups: 63, churned: 3 },
        { week: 'Week of Apr 7', signups: 95, churned: 9 },
      ],
    }),
  ),

  http.get(`${BASE}/admin/users/recent`, () =>
    HttpResponse.json({
      success: true,
      data: [
        {
          id: 'u-1',
          name: 'Priya Sharma',
          email: 'priya@startup.io',
          avatarUrl: null,
          plan: 'pro',
          signedUpAt: new Date().toISOString(),
          status: 'active',
        },
        {
          id: 'u-2',
          name: 'Marcus Chen',
          email: 'marcus@idea.co',
          avatarUrl: null,
          plan: 'free',
          signedUpAt: new Date().toISOString(),
          status: 'unverified',
        },
        {
          id: 'u-3',
          name: "Sarah O'Brien",
          email: 'sarah@builder.xyz',
          avatarUrl: null,
          plan: 'pro',
          signedUpAt: new Date().toISOString(),
          status: 'active',
        },
      ],
    }),
  ),

  http.get(`${BASE}/admin/activity`, () =>
    HttpResponse.json({
      success: true,
      data: [
        {
          id: 'ev-1',
          type: 'user.upgrade',
          actorName: 'Priya Sharma',
          actorAvatarUrl: null,
          description: 'Upgraded from Free to Pro',
          metadata: {},
          occurredAt: new Date().toISOString(),
        },
        {
          id: 'ev-2',
          type: 'payment.received',
          actorName: 'Marcus Chen',
          actorAvatarUrl: null,
          description: 'Payment received — $29.00',
          metadata: {},
          occurredAt: new Date().toISOString(),
        },
        {
          id: 'ev-3',
          type: 'project.created',
          actorName: "Sarah O'Brien",
          actorAvatarUrl: null,
          description: 'Created project "FoodieAI"',
          metadata: {},
          occurredAt: new Date().toISOString(),
        },
      ],
    }),
  ),

  // ── USERS (specific paths before :userId) ─────────────────────────────────
  http.get(`${BASE}/admin/users/export`, () =>
    new HttpResponse('id,name,email\nu-1,Priya,priya@startup.io', {
      headers: { 'Content-Type': 'text/csv' },
    }),
  ),

  http.get(`${BASE}/admin/users`, ({ request }) => {
    const url = new URL(request.url)
    const page = Number(url.searchParams.get('page') ?? 1)
    return HttpResponse.json({
      success: true,
      data: {
        users: [
          {
            id: 'u-1',
            name: 'Priya Sharma',
            email: 'priya@startup.io',
            avatarUrl: null,
            plan: 'pro',
            projectCount: 4,
            tokensUsedThisMonth: 48200,
            joinedAt: new Date().toISOString(),
            status: 'active',
            lastActiveAt: new Date().toISOString(),
          },
          {
            id: 'u-2',
            name: 'Marcus Chen',
            email: 'marcus@idea.co',
            avatarUrl: null,
            plan: 'free',
            projectCount: 1,
            tokensUsedThisMonth: 3100,
            joinedAt: new Date().toISOString(),
            status: 'unverified',
            lastActiveAt: null,
          },
          {
            id: 'u-3',
            name: "Sarah O'Brien",
            email: 'sarah@builder.xyz',
            avatarUrl: null,
            plan: 'pro',
            projectCount: 7,
            tokensUsedThisMonth: 112000,
            joinedAt: new Date().toISOString(),
            status: 'suspended',
            lastActiveAt: new Date().toISOString(),
          },
        ],
        total: 3,
        page,
        limit: 25,
        totalPages: 1,
      },
    })
  }),

  http.get(`${BASE}/admin/users/:userId`, ({ params }) =>
    HttpResponse.json({
      success: true,
      data: {
        id: params['userId'],
        name: 'Priya Sharma',
        email: 'priya@startup.io',
        avatarUrl: null,
        plan: 'pro',
        projectCount: 4,
        tokensUsedThisMonth: 48200,
        joinedAt: new Date().toISOString(),
        status: 'active',
        lastActiveAt: new Date().toISOString(),
        role: 'user',
        bio: 'Building in public',
        company: 'StartupLab',
        website: 'https://startuplab.io',
        timezone: 'Asia/Kolkata',
        onboardingDone: true,
        totalTokensUsed: 284000,
        agentRunsTotal: 47,
        agentRunsThisMonth: 12,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        adminNotes: '',
        topAgentBreakdown: [
          {
            agentType: 'frontend',
            tokens: 124000,
            requests: 820,
            avgTokensPerRun: 151,
            costUsd: 31,
          },
          {
            agentType: 'backend',
            tokens: 98000,
            requests: 740,
            avgTokensPerRun: 132,
            costUsd: 24.5,
          },
        ],
      },
    }),
  ),

  http.patch(`${BASE}/admin/users/:userId/notes`, () =>
    HttpResponse.json({ success: true, data: {} }),
  ),

  http.get(`${BASE}/admin/users/:userId/projects`, () =>
    HttpResponse.json({
      success: true,
      data: [
        {
          id: 'proj-1',
          name: 'RestaurantIQ',
          emoji: '🍽️',
          currentPhase: 4,
          status: 'active',
          buildMode: 'copilot',
          lastActiveAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
      ],
    }),
  ),

  http.get(`${BASE}/admin/users/:userId/login-history`, () =>
    HttpResponse.json({
      success: true,
      data: [
        {
          id: 'l-1',
          ip: '203.0.113.42',
          userAgent: 'Mozilla/5.0 Chrome/120',
          location: 'Mumbai, India',
          success: true,
          failureReason: null,
          occurredAt: new Date().toISOString(),
        },
        {
          id: 'l-2',
          ip: '203.0.113.99',
          userAgent: 'Mozilla/5.0 Safari/17',
          location: 'Bengaluru, India',
          success: false,
          failureReason: 'INVALID_PASSWORD',
          occurredAt: new Date().toISOString(),
        },
      ],
    }),
  ),

  http.get(`${BASE}/admin/users/:userId/invoices`, () =>
    HttpResponse.json({
      success: true,
      data: [
        {
          id: 'inv-1',
          amountCents: 2900,
          currency: 'usd',
          status: 'paid',
          plan: 'pro',
          periodStart: new Date().toISOString(),
          periodEnd: new Date().toISOString(),
          invoiceUrl: 'https://stripe.com/invoices/test',
          createdAt: new Date().toISOString(),
        },
      ],
    }),
  ),

  http.post(`${BASE}/admin/users/:userId/suspend`, () =>
    HttpResponse.json({ success: true, data: {} }),
  ),

  http.post(`${BASE}/admin/users/:userId/reactivate`, () =>
    HttpResponse.json({ success: true, data: {} }),
  ),

  http.patch(`${BASE}/admin/users/:userId/plan`, () =>
    HttpResponse.json({ success: true, data: {} }),
  ),

  http.post(`${BASE}/admin/users/:userId/impersonate`, () =>
    HttpResponse.json({
      success: true,
      data: {
        impersonateUrl: 'http://localhost:3000/?impersonate=tok_test123',
      },
    }),
  ),

  http.post(`${BASE}/admin/users/bulk-suspend`, () =>
    HttpResponse.json({ success: true, data: { suspended: 2 } }),
  ),

  // ── BILLING ───────────────────────────────────────────────────────────────
  http.get(`${BASE}/admin/billing/summary`, () =>
    HttpResponse.json({
      success: true,
      data: {
        mrrCents: 2480000,
        arrCents: 29760000,
        churnRate: 2.4,
        ltv: 84000,
        changes: { mrr: 14.3, arr: 14.3, churnRate: -0.2, ltv: 8.1 },
      },
    }),
  ),

  http.get(`${BASE}/admin/billing/plans`, () =>
    HttpResponse.json({
      success: true,
      data: [
        {
          id: 'plan-1',
          tier: 'free',
          name: 'Free',
          priceMonthly: 0,
          priceYearly: 0,
          tokenLimit: 50000,
          projectLimit: 3,
          features: ['Phase 1 & 2'],
          userCount: 8204,
          monthlyRevenueCents: 0,
          stripePriceId: null,
        },
        {
          id: 'plan-2',
          tier: 'pro',
          name: 'Pro',
          priceMonthly: 2900,
          priceYearly: 29000,
          tokenLimit: 500000,
          projectLimit: 20,
          features: ['All phases', '500K tokens'],
          userCount: 4512,
          monthlyRevenueCents: 2480000,
          stripePriceId: 'price_test_pro',
        },
      ],
    }),
  ),

  http.patch(`${BASE}/admin/billing/plans/:planId`, async ({ request, params }) => {
    const body = (await request.json()) as Record<string, unknown>
    const planId = params['planId'] as string
    return HttpResponse.json({
      success: true,
      data: {
        id: planId,
        tier: 'pro',
        name: (body.name as string) ?? 'Pro',
        priceMonthly: (body.priceMonthly as number) ?? 2900,
        priceYearly: (body.priceYearly as number) ?? 29000,
        tokenLimit: (body.tokenLimit as number) ?? 500000,
        projectLimit: (body.projectLimit as number) ?? 20,
        features: (body.features as string[]) ?? ['All phases'],
        userCount: 4512,
        monthlyRevenueCents: 2480000,
        stripePriceId: 'price_test_pro',
      },
    })
  }),

  http.get(`${BASE}/admin/billing/transactions/export`, () =>
    new HttpResponse('id,amount\n', {
      headers: { 'Content-Type': 'text/csv' },
    }),
  ),

  http.get(`${BASE}/admin/billing/transactions`, () =>
    HttpResponse.json({
      success: true,
      data: {
        transactions: [
          {
            id: 'tx-1',
            userId: 'u-1',
            userName: 'Priya Sharma',
            userEmail: 'priya@startup.io',
            amountCents: 2900,
            currency: 'usd',
            status: 'succeeded',
            plan: 'pro',
            description: 'Pro monthly',
            refundedAmountCents: 0,
            invoicePdfUrl: 'https://stripe.com/invoice/test',
            createdAt: new Date().toISOString(),
          },
        ],
        total: 1,
        page: 1,
        totalPages: 1,
      },
    }),
  ),

  http.post(`${BASE}/admin/billing/transactions/:id/refund`, () =>
    HttpResponse.json({ success: true, data: {} }),
  ),

  http.get(`${BASE}/admin/billing/coupons`, () =>
    HttpResponse.json({
      success: true,
      data: [
        {
          id: 'coup-1',
          code: 'LAUNCH50',
          discountType: 'percent',
          discountValue: 50,
          maxUses: 100,
          usedCount: 23,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          stripeCouponId: 'coupon_test',
          createdAt: new Date().toISOString(),
        },
      ],
    }),
  ),

  http.post(`${BASE}/admin/billing/coupons`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>
    return HttpResponse.json(
      {
        success: true,
        data: {
          id: 'coup-new',
          ...body,
          usedCount: 0,
          stripeCouponId: null,
          createdAt: new Date().toISOString(),
        },
      },
      { status: 201 },
    )
  }),

  http.delete(`${BASE}/admin/billing/coupons/:couponId`, () =>
    HttpResponse.json({ success: true, data: { deleted: true } }),
  ),

  // ── AI USAGE ──────────────────────────────────────────────────────────────
  http.get(`${BASE}/admin/ai-usage/overview`, () =>
    HttpResponse.json({
      success: true,
      data: {
        tokensToday: 2847000,
        tokensThisMonth: 48200000,
        projectedCostUsd: 1842.3,
        costThisMonthUsd: 1204.8,
      },
    }),
  ),

  http.get(`${BASE}/admin/ai-usage/tokens`, () =>
    HttpResponse.json({
      success: true,
      data: [
        { date: 'Apr 1', tokens: 1200000, costUsd: 24.8 },
        { date: 'Apr 7', tokens: 1840000, costUsd: 38.2 },
        { date: 'Apr 14', tokens: 2100000, costUsd: 42.6 },
        { date: 'Apr 19', tokens: 2847000, costUsd: 58.4 },
      ],
    }),
  ),

  http.get(`${BASE}/admin/ai-usage/models`, () =>
    HttpResponse.json({
      success: true,
      data: [
        {
          model: 'claude-sonnet-4-6',
          requests: 48200,
          tokens: 38400000,
          avgLatencyMs: 2840,
          costUsd: 960.0,
          sharePercent: 79.6,
        },
        {
          model: 'gpt-4o',
          requests: 8400,
          tokens: 9800000,
          avgLatencyMs: 1840,
          costUsd: 244.8,
          sharePercent: 20.4,
        },
      ],
    }),
  ),

  http.get(`${BASE}/admin/ai-usage/top-users`, () =>
    HttpResponse.json({
      success: true,
      data: [
        {
          userId: 'u-3',
          userName: "Sarah O'Brien",
          userEmail: 'sarah@builder.xyz',
          plan: 'pro',
          tokensThisMonth: 112000,
          tokenLimit: 500000,
          percentOfLimit: 22.4,
          projectedOverage: 0,
        },
      ],
    }),
  ),

  http.get(`${BASE}/admin/ai-usage/agents`, () =>
    HttpResponse.json({
      success: true,
      data: [
        {
          agentType: 'frontend',
          tokens: 12400000,
          requests: 8200,
          avgTokensPerRun: 1512,
          costUsd: 310.0,
        },
        {
          agentType: 'backend',
          tokens: 9800000,
          requests: 7400,
          avgTokensPerRun: 1324,
          costUsd: 245.0,
        },
        {
          agentType: 'prd',
          tokens: 4200000,
          requests: 14200,
          avgTokensPerRun: 296,
          costUsd: 105.0,
        },
        {
          agentType: 'idea_analyzer',
          tokens: 2100000,
          requests: 18400,
          avgTokensPerRun: 114,
          costUsd: 52.5,
        },
      ],
    }),
  ),

  http.get(`${BASE}/admin/ai-usage/limits`, () =>
    HttpResponse.json({
      success: true,
      data: [
        { plan: 'free', tokenLimit: 50000, isUnlimited: false },
        { plan: 'pro', tokenLimit: 500000, isUnlimited: false },
        { plan: 'enterprise', tokenLimit: 0, isUnlimited: true },
      ],
    }),
  ),

  http.patch(`${BASE}/admin/ai-usage/limits/:plan`, async ({ request, params }) => {
    const body = (await request.json()) as Record<string, unknown>
    const plan = params['plan'] as string
    return HttpResponse.json({
      success: true,
      data: {
        plan,
        tokenLimit: Number(body['tokenLimit'] ?? 0),
        isUnlimited: Boolean(body['isUnlimited']),
      },
    })
  }),

  http.post(`${BASE}/admin/ai-usage/throttle`, () =>
    HttpResponse.json({ success: true, data: {} }),
  ),

  // ── PROJECTS ─────────────────────────────────────────────────────────────
  http.get(`${BASE}/admin/projects`, () =>
    HttpResponse.json({
      success: true,
      data: {
        projects: [
          {
            id: 'proj-1',
            name: 'RestaurantIQ',
            emoji: '🍽️',
            userId: 'u-1',
            userName: 'Priya Sharma',
            userEmail: 'priya@startup.io',
            currentPhase: 4,
            status: 'active',
            buildMode: 'copilot',
            agentRunCount: 47,
            tokensUsed: 284000,
            lastActiveAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
          },
          {
            id: 'proj-2',
            name: 'HealthAI Coach',
            emoji: '🏥',
            userId: 'u-3',
            userName: "Sarah O'Brien",
            userEmail: 'sarah@builder.xyz',
            currentPhase: 6,
            status: 'launched',
            buildMode: 'autopilot',
            agentRunCount: 120,
            tokensUsed: 890000,
            lastActiveAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
          },
        ],
        total: 2,
        page: 1,
        totalPages: 1,
      },
    }),
  ),

  http.get(`${BASE}/admin/projects/:projectId`, ({ params }) =>
    HttpResponse.json({
      success: true,
      data: {
        id: params['projectId'],
        name: 'RestaurantIQ',
        emoji: '🍽️',
        userId: 'u-1',
        userName: 'Priya Sharma',
        userEmail: 'priya@startup.io',
        currentPhase: 4,
        status: 'active',
        buildMode: 'copilot',
        agentRunCount: 47,
        tokensUsed: 284000,
        lastActiveAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        phaseOutputs: {
          phase1: { idea: 'Restaurant discovery' },
          phase2: { market: 'SMB' },
        },
      },
    }),
  ),

  // ── SYSTEM ────────────────────────────────────────────────────────────────
  http.get(`${BASE}/admin/system/health`, () =>
    HttpResponse.json({
      success: true,
      data: [
        {
          name: 'API Gateway',
          status: 'up',
          uptimePercent: 99.98,
          lastIncidentAt: null,
          responseTimeMs: 42,
          endpoint: '/health',
        },
        {
          name: 'Database',
          status: 'up',
          uptimePercent: 99.99,
          lastIncidentAt: null,
          responseTimeMs: 8,
          endpoint: '/health',
        },
        {
          name: 'AI Proxy',
          status: 'degraded',
          uptimePercent: 98.4,
          lastIncidentAt: new Date().toISOString(),
          responseTimeMs: 1840,
          endpoint: '/health',
        },
        {
          name: 'Auth',
          status: 'up',
          uptimePercent: 99.97,
          lastIncidentAt: null,
          responseTimeMs: 24,
          endpoint: '/health',
        },
        {
          name: 'Storage',
          status: 'up',
          uptimePercent: 100,
          lastIncidentAt: null,
          responseTimeMs: 18,
          endpoint: '/health',
        },
        {
          name: 'Queue',
          status: 'up',
          uptimePercent: 99.95,
          lastIncidentAt: null,
          responseTimeMs: 12,
          endpoint: '/health',
        },
      ],
    }),
  ),

  http.get(`${BASE}/admin/system/errors`, () =>
    HttpResponse.json({
      success: true,
      data: {
        errors: [
          {
            id: 'err-1',
            severity: 'error',
            type: 'UnhandledPromiseRejection',
            endpoint: 'POST /ai/runs',
            userId: 'u-1',
            userEmail: 'p***@startup.io',
            userEmailUnmasked: 'priya@startup.io',
            message: 'Claude API timeout after 30s',
            stack: 'Error: timeout\n    at AgentRunner.run (/src/agents/base.ts:42)',
            occurredAt: new Date().toISOString(),
          },
          {
            id: 'err-2',
            severity: 'warning',
            type: 'RateLimitApproach',
            endpoint: 'GET /rag/documents',
            userId: null,
            userEmail: null,
            message: 'Rate limit at 85% for user namespace',
            stack: null,
            occurredAt: new Date().toISOString(),
          },
        ],
        total: 2,
      },
    }),
  ),

  http.get(`${BASE}/admin/system/latency`, () => {
    const points = Array.from({ length: 24 * 4 }, (_, i) => {
      const h = Math.floor(i / 4)
      const m = (i % 4) * 15
      return {
        time: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
        p50: 80 + Math.random() * 40,
        p95: 200 + Math.random() * 200,
        p99: 400 + Math.random() * 600,
      }
    })
    return HttpResponse.json({ success: true, data: points })
  }),

  http.post(`${BASE}/admin/system/incidents`, () =>
    HttpResponse.json({ success: true, data: { id: 'inc-1' } }),
  ),

  // ── AUDIT ─────────────────────────────────────────────────────────────────
  http.get(`${BASE}/admin/audit/export`, () =>
    new HttpResponse(
      'id,action,targetLabel,ipAddress,createdAt\naud-1,user.suspended,marcus@idea.co,203.0.113.1,2025-01-15',
      { headers: { 'Content-Type': 'text/csv' } },
    ),
  ),

  http.get(`${BASE}/admin/audit`, () =>
    HttpResponse.json({
      success: true,
      data: {
        logs: [
          {
            id: 'aud-1',
            adminId: 'admin-1',
            adminEmail: 'admin@example.com',
            adminName: 'Super Admin',
            action: 'user.suspended',
            targetType: 'user',
            targetId: 'u-2',
            targetLabel: 'marcus@idea.co',
            beforeState: { status: 'active' },
            afterState: { status: 'suspended' },
            ipAddress: '203.0.113.1',
            userAgent: 'Mozilla Chrome/120',
            createdAt: new Date().toISOString(),
          },
          {
            id: 'aud-2',
            adminId: 'admin-1',
            adminEmail: 'admin@example.com',
            adminName: 'Super Admin',
            action: 'refund.issued',
            targetType: 'user',
            targetId: 'u-1',
            targetLabel: 'priya@startup.io',
            beforeState: { refundedAmount: 0 },
            afterState: { refundedAmount: 2900 },
            ipAddress: '203.0.113.1',
            userAgent: 'Mozilla Chrome/120',
            createdAt: new Date().toISOString(),
          },
        ],
        total: 2,
        page: 1,
        totalPages: 1,
      },
    }),
  ),
]
