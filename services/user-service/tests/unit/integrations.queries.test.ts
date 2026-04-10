import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../src/lib/db.js', () => ({
  getDb: vi.fn(),
}))

import * as dbMod from '../../src/lib/db.js'
import * as integrationsQueries from '../../src/db/queries/integrations.queries.js'

describe('integrations.queries', () => {
  const mockDb = {
    select: vi.fn(),
    insert: vi.fn(),
    delete: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(dbMod.getDb).mockReturnValue(mockDb as never)
  })

  it('findIntegrationsByUserId returns rows', async () => {
    const rows = [{ id: '1' }] as never[]
    mockDb.select.mockReturnValue({
      from: () => ({
        where: () => Promise.resolve(rows),
      }),
    } as never)

    await expect(integrationsQueries.findIntegrationsByUserId('u1')).resolves.toBe(rows)
  })

  it('findIntegration returns single row', async () => {
    const row = { id: '1' } as never
    mockDb.select.mockReturnValue({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([row]),
        }),
      }),
    } as never)

    await expect(integrationsQueries.findIntegration('u1', 'github')).resolves.toBe(row)
  })

  it('upsertIntegration returns row', async () => {
    const row = { id: '1' } as never
    mockDb.insert.mockReturnValue({
      values: () => ({
        onConflictDoUpdate: () => ({
          returning: () => Promise.resolve([row]),
        }),
      }),
    } as never)

    await expect(
      integrationsQueries.upsertIntegration({
        userId: 'u1',
        service: 'github',
        accessTokenEnc: 'enc',
        scopes: [],
        metadata: {},
      } as never),
    ).resolves.toBe(row)
  })

  it('deleteIntegration and deleteAllIntegrationsForUser run delete', async () => {
    mockDb.delete.mockReturnValue({
      where: () => Promise.resolve(undefined),
    } as never)

    await integrationsQueries.deleteIntegration('u1', 'github')
    await integrationsQueries.deleteAllIntegrationsForUser('u1')
    expect(mockDb.delete).toHaveBeenCalled()
  })
})
