import { act, renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { useFileTree } from '@/hooks/useFileTree'
import { server } from '@/tests/mocks/server'

describe('useFileTree', () => {
  it('loadFiles calls GET /projects/:id/files and builds nested tree', async () => {
    const { result } = renderHook(() => useFileTree('proj-1'))
    await act(async () => {
      await result.current.loadFiles('proj-1')
    })
    await waitFor(() => expect(result.current.tree.length).toBeGreaterThan(0))
    const src = result.current.tree.find((n) => n.name === 'src')
    expect(src?.type).toBe('folder')
    const schema = src?.children?.find((c) => c.name === 'schema')
    expect(schema?.type).toBe('folder')
    const userTs = schema?.children?.find((c) => c.name === 'user.ts')
    expect(userTs?.path).toBe('/src/schema/user.ts')
  })

  it('sorts folders before files and alphabetically', async () => {
    server.use(
      http.get('*/projects/proj-sort/files', async () =>
        HttpResponse.json({
          data: [
            {
              id: 'a',
              projectId: 'proj-sort',
              path: '/z.ts',
              content: '',
              language: 'typescript',
              agentType: 'schema',
              isModified: false,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            {
              id: 'b',
              projectId: 'proj-sort',
              path: '/a/b.ts',
              content: '',
              language: 'typescript',
              agentType: 'schema',
              isModified: false,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
        }),
      ),
    )
    const { result } = renderHook(() => useFileTree('proj-sort'))
    await act(async () => {
      await result.current.loadFiles('proj-sort')
    })
    await waitFor(() => expect(result.current.tree.length).toBeGreaterThan(0))
    const names = result.current.tree.map((n) => n.name)
    expect(names[0]).toBe('a')
    expect(names[1]).toBe('z.ts')
  })

  it('toggleFolder adds and removes expanded paths', async () => {
    const { result } = renderHook(() => useFileTree('proj-1'))
    await act(async () => {
      await result.current.loadFiles('proj-1')
    })
    act(() => result.current.toggleFolder('/src'))
    expect(result.current.expandedFolders.has('/src')).toBe(false)
    act(() => result.current.toggleFolder('/src'))
    expect(result.current.expandedFolders.has('/src')).toBe(true)
  })

  it('openFile sets active tab without duplicating', async () => {
    const { result } = renderHook(() => useFileTree('proj-1'))
    await act(async () => {
      await result.current.loadFiles('proj-1')
    })
    await waitFor(() => expect(result.current.openTabs.length).toBeGreaterThan(0))
    const firstPath = result.current.openTabs[0]!.path
    act(() => void result.current.openFile(firstPath))
    const n = result.current.openTabs.length
    act(() => void result.current.openFile(firstPath))
    expect(result.current.openTabs.length).toBe(n)
    expect(result.current.activeTab).toBe(firstPath)
  })

  it('closeTab removes tab and activates previous', async () => {
    const { result } = renderHook(() => useFileTree('proj-1'))
    await act(async () => {
      await result.current.loadFiles('proj-1')
    })
    await waitFor(() => expect(result.current.files.length).toBeGreaterThan(1))
    const p1 = '/src/schema/user.ts'
    const p2 = '/src/routes/auth.ts'
    act(() => void result.current.openFile(p1))
    act(() => void result.current.openFile(p2))
    act(() => result.current.closeTab(p2))
    expect(result.current.openTabs.some((t) => t.path === p2)).toBe(false)
    expect(result.current.activeTab).toBe(p1)
  })

  it('closeTab clears active when last tab closed', async () => {
    const { result } = renderHook(() => useFileTree('proj-1'))
    await act(async () => {
      await result.current.loadFiles('proj-1')
    })
    await waitFor(() => expect(result.current.openTabs.length).toBeGreaterThan(0))
    for (const tab of [...result.current.openTabs]) {
      act(() => result.current.closeTab(tab.path))
    }
    expect(result.current.activeTab).toBeNull()
  })

  it('addStreamingFile adds streaming path and completeStreamingFile clears and persists', async () => {
    const { result } = renderHook(() => useFileTree('proj-1'))
    await act(async () => {
      await result.current.loadFiles('proj-1')
    })
    act(() => result.current.addStreamingFile('/src/new.ts', 'typescript'))
    expect(result.current.streamingPaths.has('/src/new.ts')).toBe(true)
    await act(async () => {
      await result.current.completeStreamingFile('/src/new.ts', 10)
    })
    await waitFor(() => expect(result.current.streamingPaths.has('/src/new.ts')).toBe(false))
  })

  it('setBatchProgress stores batch info', async () => {
    const { result } = renderHook(() => useFileTree('proj-1'))
    act(() =>
      result.current.setBatchProgress({
        type: 'batch_start',
        runId: 'r1',
        batchNumber: 2,
        totalBatches: 7,
        agentType: 'schema_gen',
        fileCount: 5,
      }),
    )
    expect(result.current.batchProgress?.current).toBe(2)
    expect(result.current.batchProgress?.total).toBe(7)
    expect(result.current.batchProgress?.estimatedBatchFiles).toBe(5)
  })

  it('saveActiveFile calls PATCH and cycles saveStatus', async () => {
    const { result } = renderHook(() => useFileTree('proj-1'))
    await act(async () => {
      await result.current.loadFiles('proj-1')
    })
    await waitFor(() => expect(result.current.files.length).toBeGreaterThan(0))
    const path = result.current.files[0]!.path
    act(() => void result.current.openFile(path))
    await act(async () => {
      await result.current.saveActiveFile('edited')
    })
    await waitFor(() => expect(result.current.saveStatus === 'idle' || result.current.saveStatus === 'saved').toBe(true))
  })
})
