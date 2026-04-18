import { act, renderHook } from '@testing-library/react'
import type { FormEvent } from 'react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

import { useInlineEdit } from '@/hooks/useInlineEdit'
import api from '@/lib/axios'

vi.mock('@/lib/axios', () => ({
  default: {
    patch: vi.fn(),
  },
}))

describe('useInlineEdit', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.mocked(api.patch).mockResolvedValue({ data: { saved: true } })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('sets initial value and data-field', () => {
    const { result } = renderHook(() =>
      useInlineEdit({ projectId: 'p1', phase: 2, field: 'prd.features[0].name', initialValue: 'Auth' }),
    )
    expect(result.current.value).toBe('Auth')
    expect(result.current.contentEditableProps['data-field']).toBe('prd.features[0].name')
  })

  it('debounces onInput save', async () => {
    const { result } = renderHook(() =>
      useInlineEdit({ projectId: 'p1', phase: 2, field: 'prd.features[0].name', initialValue: 'Auth' }),
    )
    act(() => {
      result.current.contentEditableProps.onInput({
        currentTarget: { textContent: 'Auth 2' },
      } as unknown as FormEvent<HTMLElement>)
    })
    expect(api.patch).not.toHaveBeenCalled()
    await act(async () => {
      vi.advanceTimersByTime(500)
    })
    expect(api.patch).toHaveBeenCalledWith('/projects/p1/phase-data/2', {
      field: 'prd.features[0].name',
      value: 'Auth 2',
    })
  })

  it('blur saves immediately and updates statuses', async () => {
    const { result } = renderHook(() =>
      useInlineEdit({ projectId: 'p1', phase: 2, field: 'prd.features[0].name', initialValue: 'Auth' }),
    )
    act(() => {
      result.current.contentEditableProps.onFocus()
    })
    expect(result.current.contentEditableProps.style.borderBottom).toContain('#8B6F47')

    act(() => {
      result.current.contentEditableProps.onInput({
        currentTarget: { textContent: 'Auth Blur' },
      } as unknown as FormEvent<HTMLElement>)
      result.current.contentEditableProps.onBlur()
    })

    expect(result.current.saveStatus).toBe('saving')
    await act(async () => Promise.resolve())
    expect(result.current.saveStatus).toBe('saved')

    await act(async () => {
      vi.advanceTimersByTime(2000)
    })
    expect(result.current.saveStatus).toBe('idle')
  })

  it('sets error status and resets after 4s', async () => {
    vi.mocked(api.patch).mockRejectedValueOnce(new Error('nope'))
    const { result } = renderHook(() =>
      useInlineEdit({ projectId: 'p1', phase: 2, field: 'prd.features[0].name', initialValue: 'Auth' }),
    )

    act(() => result.current.contentEditableProps.onBlur())
    await act(async () => Promise.resolve())
    expect(result.current.saveStatus).toBe('error')

    await act(async () => {
      vi.advanceTimersByTime(4000)
    })
    expect(result.current.saveStatus).toBe('idle')
  })
})
