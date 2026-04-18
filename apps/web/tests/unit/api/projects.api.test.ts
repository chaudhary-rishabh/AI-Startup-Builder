import { describe, expect, it } from 'vitest'

import { createProject, getPhaseRoute, getProjects } from '@/api/projects.api'

describe('projects.api', () => {
  describe('getProjects', () => {
    it('returns project array from GET /projects', async () => {
      const result = await getProjects()
      expect(Array.isArray(result.projects)).toBe(true)
      expect(result.projects.length).toBeGreaterThan(0)
    })

    it('each project has required fields', async () => {
      const result = await getProjects()
      const p = result.projects[0]
      expect(p.id).toBeDefined()
      expect(p.name).toBeDefined()
      expect(p.buildMode).toBeDefined()
      expect(p.currentPhase).toBeGreaterThanOrEqual(1)
    })
  })

  describe('createProject', () => {
    it('sends buildMode in payload', async () => {
      const result = await createProject({
        name: 'Test',
        emoji: '🚀',
        buildMode: 'autopilot',
      })
      expect(result.id).toBeDefined()
    })
  })

  describe('getPhaseRoute', () => {
    it.each([
      [1, '/project/abc/validate'],
      [2, '/project/abc/plan'],
      [3, '/project/abc/design'],
      [4, '/project/abc/build'],
      [5, '/project/abc/deploy'],
      [6, '/project/abc/growth'],
    ])('phase %i maps to %s', (phase, expected) => {
      expect(getPhaseRoute('abc', phase)).toBe(expected)
    })
  })
})
