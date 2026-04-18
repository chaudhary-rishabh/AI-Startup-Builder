import { vi } from 'vitest'

// Must run before any module imports `localStorage` / persist stores (import hoisting).
const createStorageMock = () => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
    get length() {
      return Object.keys(store).length
    },
    key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
  }
}

Object.defineProperty(window, 'localStorage', {
  writable: true,
  value: createStorageMock(),
})

Object.defineProperty(window, 'sessionStorage', {
  writable: true,
  value: createStorageMock(),
})
