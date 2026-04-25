import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'

import {
  chatComplete,
  deepseekClient,
  DEEPSEEK_MODEL,
  deepseekR1Client,
  DEEPSEEK_R1_MODEL,
  geminiComplete,
  GEMINI_MODEL,
  minimaxClient,
  MINIMAX_MODEL,
} from '../lib/providers.js'
import { err, ok } from '../lib/response.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { estimateCost } from '../services/modelRouter.service.js'
import { checkTokenBudget, recordTokenUsage } from '../services/tokenBudget.service.js'

const ChatBodySchema = z.object({
  content: z.string().min(1).max(100_000),
  model: z
    .enum(['MiniMax-M2.7', 'deepseek-v4-flash', 'deepseek-reasoner', 'gemini-2.0-flash'])
    .optional(),
})

const routes = new Hono()
routes.use('*', requireAuth)

routes.post('/chat', zValidator('json', ChatBodySchema), async (c) => {
  const userId = c.get('userId' as never) as string
  const body = c.req.valid('json')
  const model = body.model ?? MINIMAX_MODEL
  const estimated = Math.ceil(body.content.length / 4) + 4096
  const userEmail = (c.get('userEmail' as never) as string | undefined) ?? ''
  const userName = (c.get('userName' as never) as string | undefined) ?? ''
  const budget = await checkTokenBudget(userId, estimated, {
    ...(userEmail !== '' ? { userEmail, userName } : {}),
  })
  if (!budget.allowed) {
    if (budget.creditState === 'exhausted') {
      return err(c, 422, 'CREDITS_EXHAUSTED', 'Your free credits have been used. Upgrade to continue building.')
    }
    return err(c, 422, 'TOKEN_BUDGET_EXCEEDED', 'Token budget exceeded for this billing period')
  }

  let text: string
  if (model === GEMINI_MODEL) {
    text = await geminiComplete(body.content, 4096)
  } else if (model === DEEPSEEK_MODEL) {
    text = await chatComplete(deepseekClient, model, [{ role: 'user', content: body.content }], 4096)
  } else if (model === DEEPSEEK_R1_MODEL) {
    text = await chatComplete(deepseekR1Client, model, [{ role: 'user', content: body.content }], 4096)
  } else {
    text = await chatComplete(minimaxClient, model, [{ role: 'user', content: body.content }], 4096)
  }

  const inputTokens = Math.ceil(body.content.length / 4)
  const outputTokens = Math.ceil(text.length / 4)
  const tokensUsed = inputTokens + outputTokens
  const costUsd = estimateCost(model, inputTokens, outputTokens)
  await recordTokenUsage(userId, tokensUsed, costUsd)

  return ok(c, {
    content: text,
    model,
    inputTokens,
    outputTokens,
    tokensUsed,
  })
})

export default routes
