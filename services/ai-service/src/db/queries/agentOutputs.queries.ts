import { eq } from 'drizzle-orm'

import { agentOutputs } from '../schema.js'
import { getDb } from '../../lib/db.js'

import type { AgentOutput, NewAgentOutput } from '../schema.js'

export async function createAgentOutput(data: NewAgentOutput): Promise<AgentOutput> {
  const db = getDb()
  const [row] = await db.insert(agentOutputs).values(data).returning()
  if (!row) throw new Error('createAgentOutput: insert returned no row')
  return row
}

export async function findOutputByRunId(runId: string): Promise<AgentOutput | undefined> {
  const db = getDb()
  const [row] = await db.select().from(agentOutputs).where(eq(agentOutputs.runId, runId)).limit(1)
  return row
}
