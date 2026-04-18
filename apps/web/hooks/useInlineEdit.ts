'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'

import api from '@/lib/axios'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface UseInlineEditOptions {
  projectId: string
  phase: number
  field: string
  initialValue: string
  debounceMs?: number
}

interface UseInlineEditReturn {
  value: string
  saveStatus: SaveStatus
  contentEditableProps: {
    contentEditable: true
    suppressContentEditableWarning: true
    onInput: (event: FormEvent<HTMLElement>) => void
    onBlur: () => void
    onFocus: () => void
    style: CSSProperties
    'data-field': string
  }
}

export function useInlineEdit({
  projectId,
  phase,
  field,
  initialValue,
  debounceMs = 500,
}: UseInlineEditOptions): UseInlineEditReturn {
  const [value, setValue] = useState(initialValue)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [isFocused, setIsFocused] = useState(false)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const resetStatusRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setValue(initialValue)
  }, [initialValue])

  const scheduleIdleReset = useCallback((ms: number): void => {
    if (resetStatusRef.current) clearTimeout(resetStatusRef.current)
    resetStatusRef.current = setTimeout(() => setSaveStatus('idle'), ms)
  }, [])

  const saveField = useCallback(
    async (newValue: string): Promise<void> => {
      setSaveStatus('saving')
      try {
        await api.patch(`/projects/${projectId}/phase-data/${phase}`, {
          field,
          value: newValue,
        })
        setSaveStatus('saved')
        scheduleIdleReset(2000)
      } catch {
        setSaveStatus('error')
        scheduleIdleReset(4000)
      }
    },
    [field, phase, projectId, scheduleIdleReset],
  )

  const onInput = (event: FormEvent<HTMLElement>): void => {
    const newValue = event.currentTarget.textContent ?? ''
    setValue(newValue)
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    debounceTimerRef.current = setTimeout(() => {
      void saveField(newValue)
    }, debounceMs)
  }

  const onBlur = (): void => {
    setIsFocused(false)
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    void saveField(value)
  }

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
      if (resetStatusRef.current) clearTimeout(resetStatusRef.current)
    }
  }, [])

  return {
    value,
    saveStatus,
    contentEditableProps: {
      contentEditable: true,
      suppressContentEditableWarning: true,
      onInput,
      onBlur,
      onFocus: () => setIsFocused(true),
      style: {
        outline: 'none',
        borderBottom: isFocused ? '1.5px solid #8B6F47' : '1.5px solid transparent',
        transition: 'border-color 150ms',
        paddingBottom: '1px',
        cursor: 'text',
      },
      'data-field': field,
    },
  }
}
