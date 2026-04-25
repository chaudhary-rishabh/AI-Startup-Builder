import { Hono } from 'hono'

import { ok } from '../lib/response.js'
import { requireAuth } from '../middleware/requireAuth.js'

const routes = new Hono()
routes.use('*', requireAuth)

routes.get('/models', (c) =>
  ok(c, {
    models: [
      {
        id: 'MiniMax-M2.7',
        name: 'MiniMax M2.7',
        provider: 'minimax',
        contextWindow: 1_000_000,
        isDefault: true,
        availableOn: ['FREE', 'PRO', 'TEAM', 'ENTERPRISE'],
        capabilities: ['streaming', 'tool_use'],
        usedFor: 'Planning, analysis, design, growth phases',
      },
      {
        id: 'deepseek-v4-flash',
        name: 'DeepSeek V4 Flash',
        provider: 'deepseek',
        contextWindow: 128_000,
        isDefault: false,
        availableOn: ['FREE', 'PRO', 'TEAM', 'ENTERPRISE'],
        capabilities: ['streaming'],
        usedFor: 'Code generation (Phase 4 and 5)',
      },
      {
        id: 'deepseek-reasoner',
        name: 'DeepSeek R1',
        provider: 'deepseek',
        contextWindow: 128_000,
        isDefault: false,
        availableOn: ['PRO', 'TEAM', 'ENTERPRISE'],
        capabilities: [],
        usedFor: 'Architecture review and pre-build audit',
      },
      {
        id: 'gemini-2.0-flash',
        name: 'Gemini 2.0 Flash',
        provider: 'google',
        contextWindow: 1_000_000,
        isDefault: false,
        availableOn: ['FREE', 'PRO', 'TEAM', 'ENTERPRISE'],
        capabilities: [],
        usedFor: 'Context summarisation and recovery',
      },
    ],
  }),
)

export default routes
