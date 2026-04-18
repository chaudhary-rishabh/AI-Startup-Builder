import '@testing-library/jest-dom'
import React from 'react'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, beforeEach, vi } from 'vitest'

import { useAuthStore } from '@/store/authStore'
import { useCanvasStore } from '@/store/canvasStore'
import { useProjectStore } from '@/store/projectStore'
import { useUIStore } from '@/store/uiStore'

import { resetMockProjectFiles, resetMockRagDocuments } from './mocks/handlers'
import { MockEventSource } from './mocks/mockEventSource'
import { server } from './mocks/server'

export { MockEventSource }

// ── MSW ─────────────────────────────────────────────────────────────────────
beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

// ── RTL cleanup ──────────────────────────────────────────────────────────────
afterEach(() => cleanup())

// ── Browser APIs not in jsdom ────────────────────────────────────────────────
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
  root: null,
  rootMargin: '',
  thresholds: [],
}))

window.HTMLElement.prototype.scrollIntoView = vi.fn()
window.HTMLElement.prototype.scrollTo = vi.fn()

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// ── Storage: mocked in setup-env.ts (before store modules load) ─────────────

// ── Clipboard (configurable so @testing-library/user-event can attach stubs) ─
Object.defineProperty(navigator, 'clipboard', {
  configurable: true,
  writable: true,
  value: {
    writeText: vi.fn().mockResolvedValue(undefined),
    readText: vi.fn().mockResolvedValue(''),
  },
})

// ── crypto.randomUUID ────────────────────────────────────────────────────────
if (!globalThis.crypto.randomUUID) {
  Object.defineProperty(globalThis.crypto, 'randomUUID', {
    value: () =>
      'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
      }),
  })
}

// ── File / FormData ──────────────────────────────────────────────────────────
global.File = class MockFile {
  name: string
  size: number
  type: string
  lastModified: number

  constructor(_parts: BlobPart[], name: string, opts?: FilePropertyBag) {
    this.name = name
    this.size = 1024
    this.type = opts?.type ?? 'application/octet-stream'
    this.lastModified = Date.now()
  }
} as unknown as typeof File

vi.stubGlobal('EventSource', MockEventSource)

afterEach(() => MockEventSource.reset())

// ── Framer Motion ─────────────────────────────────────────────────────────────
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof import('framer-motion')>('framer-motion')
  return {
    ...actual,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
    motion: new Proxy(
      {},
      {
        get: (_t, tag: string) => {
          const Comp = ({ children, ...props }: Record<string, unknown>) => {
            const { layoutId: _lid, layout: _layout, transition: _tr, ...domProps } = props
            return React.createElement(tag, domProps, children as React.ReactNode)
          }
          Comp.displayName = `motion.${tag}`
          return Comp
        },
      },
    ),
  }
})

// ── @monaco-editor/react ──────────────────────────────────────────────────────
vi.mock('@monaco-editor/react', () => ({
  Editor: vi.fn(
    ({
      value,
      onChange,
      onMount,
      language,
      'data-testid': testId,
    }: {
      value?: string
      onChange?: (v: string) => void
      onMount?: (editor: unknown, monaco: unknown) => void
      language?: string
      'data-testid'?: string
    }) => {
      const mockEditor = {
        getValue: () => value ?? '',
        setValue: vi.fn(),
        addCommand: vi.fn(),
        addAction: vi.fn(),
        getModel: vi.fn(() => ({ uri: { path: '/test.ts' } })),
      }
      const mockMonaco = {
        KeyMod: { CtrlCmd: 2048 },
        KeyCode: { KeyS: 49 },
        editor: {
          defineTheme: vi.fn(),
          setTheme: vi.fn(),
        },
      }
      React.useEffect(() => {
        onMount?.(mockEditor, mockMonaco)
      }, [])
      return React.createElement(
        'div',
        {
          'data-testid': testId ?? 'monaco-editor',
          'data-language': language,
        },
        React.createElement('textarea', {
          value: value ?? '',
          onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => onChange?.(e.target.value),
          readOnly: !onChange,
        }),
      )
    },
  ),
}))

// ── canvas-confetti ───────────────────────────────────────────────────────────
vi.mock('canvas-confetti', () => ({
  default: vi.fn(),
}))

// ── qrcode.react ──────────────────────────────────────────────────────────────
vi.mock('qrcode.react', () => ({
  QRCodeSVG: vi.fn(({ value }: { value: string }) =>
    React.createElement('div', { 'data-testid': 'qr-code', 'data-value': value }),
  ),
}))

// ── date-fns ──────────────────────────────────────────────────────────────────
vi.mock('date-fns', async () => ({
  ...(await vi.importActual<typeof import('date-fns')>('date-fns')),
  formatDistanceToNow: vi.fn(() => '2 minutes ago'),
}))

// ── Reset Zustand stores between tests ───────────────────────────────────────
beforeEach(() => {
  window.localStorage.clear()
  window.sessionStorage.clear()
  resetMockProjectFiles()
  resetMockRagDocuments()

  useAuthStore.setState({
    user: null,
    isAuthenticated: false,
    isLoading: false,
  })
  useProjectStore.setState({
    activeProjectId: null,
    currentPhase: 1,
    mode: 'design',
    buildMode: 'copilot',
    isModeTransitioning: false,
    designTokens: null,
  })
  useUIStore.setState({
    sidebarCollapsed: false,
    contextPanelOpen: true,
    toasts: [],
    tokenWarning: null,
  })
  useCanvasStore.setState({
    screens: [],
    selectedScreen: null,
  })
})
