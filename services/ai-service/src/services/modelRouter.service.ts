import type { AgentModel, AgentType } from '@repo/types'
import type OpenAI from 'openai'

import {
  deepseekClient,
  DEEPSEEK_MODEL,
  deepseekR1Client,
  DEEPSEEK_R1_MODEL,
  minimaxClient,
  MINIMAX_MODEL,
  GEMINI_MODEL,
} from '../lib/providers.js'

export type ModelRole = 'minimax' | 'deepseek' | 'deepseek_r1' | 'gemini'

const AGENT_MODEL_MAP: Record<string, ModelRole> = {
  idea_analyzer: 'minimax',
  market_research: 'minimax',
  validation: 'minimax',
  validation_scorer: 'minimax',

  prd: 'minimax',
  prd_generator: 'minimax',
  user_flow: 'minimax',
  system_design: 'minimax',
  uiux: 'minimax',

  generate_frame: 'minimax',

  schema_gen: 'deepseek',
  schema_generator: 'deepseek',
  types_gen: 'deepseek',
  middleware_gen: 'deepseek',
  api_gen: 'deepseek',
  api_generator: 'deepseek',
  db_queries_gen: 'deepseek',
  backend: 'deepseek',
  frontend: 'deepseek',
  server_gen: 'deepseek',
  skeleton: 'deepseek',
  frontend_pages_gen: 'deepseek',
  frontend_components_gen: 'deepseek',
  frontend_hooks_gen: 'deepseek',
  integration: 'deepseek',

  testing: 'deepseek',
  cicd: 'minimax',

  analytics: 'minimax',
  analytics_agent: 'minimax',
  feedback: 'minimax',
  feedback_analyzer: 'minimax',
  growth: 'minimax',
  growth_strategy: 'minimax',

  architecture_review: 'deepseek_r1',
  pre_build_audit: 'deepseek_r1',
  adr_generator: 'minimax',
}

export interface ResolvedModel {
  client: OpenAI
  model: string
  role: ModelRole
}

export function resolveModel(agentType: string): ResolvedModel {
  const role = AGENT_MODEL_MAP[agentType] ?? 'minimax'

  switch (role) {
    case 'deepseek':
      return { client: deepseekClient, model: DEEPSEEK_MODEL, role }
    case 'deepseek_r1':
      return { client: deepseekR1Client, model: DEEPSEEK_R1_MODEL, role }
    case 'minimax':
    default:
      return { client: minimaxClient, model: MINIMAX_MODEL, role }
  }
}

export function selectModel(agentType: AgentType): AgentModel {
  const { model } = resolveModel(agentType)
  return model as AgentModel
}

export function selectModelForContextGeneration(): AgentModel {
  return GEMINI_MODEL as AgentModel
}

export const TOKEN_COSTS_PER_1K: Record<string, { input: number; output: number }> = {
  'MiniMax-M2.7': { input: 0.0001, output: 0.0001 },
  'deepseek-v4-flash': { input: 0.00014, output: 0.00028 },
  'deepseek-reasoner': { input: 0.00055, output: 0.00055 },
  'gemini-2.0-flash': { input: 0.0001, output: 0.0001 },
}

export function estimateCost(model: string, promptTokens: number, completionTokens: number): string {
  const rates = TOKEN_COSTS_PER_1K[model] ?? TOKEN_COSTS_PER_1K['MiniMax-M2.7']!
  const usd =
    (promptTokens / 1000) * rates.input + (completionTokens / 1000) * rates.output
  return usd.toFixed(6)
}

export function getMaxOutputTokens(agentType: AgentType | string): number {
  if (agentType === 'backend' || agentType === 'frontend') return 16_384
  if (agentType === 'integration') return 4096
  if (agentType === 'schema_generator') return 8192
  if (agentType === 'api_generator') return 6144
  if (agentType === 'skeleton') return 4096
  if (
    agentType === 'prd_generator' ||
    agentType === 'uiux' ||
    agentType === 'testing' ||
    agentType === 'growth_strategy'
  ) {
    return 8192
  }
  return 4096
}

export function getRAGEligibleAgents(): AgentType[] {
  return ['market_research', 'prd_generator', 'feedback_analyzer', 'growth_strategy']
}
