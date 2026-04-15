import type { AgentType } from '@repo/types'

import type { BaseAgent } from './base.agent.js'

const factories = new Map<AgentType, () => BaseAgent>()

export class UnknownAgentError extends Error {
  constructor(public readonly agentType: AgentType) {
    super(`No agent registered for type: ${agentType}`)
    this.name = 'UnknownAgentError'
  }
}

export function registerAgent(agentType: AgentType, factory: () => BaseAgent): void {
  factories.set(agentType, factory)
}

export function getAgent(agentType: AgentType): BaseAgent {
  const f = factories.get(agentType)
  if (!f) throw new UnknownAgentError(agentType)
  return f()
}
