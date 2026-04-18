export class MockEventSource {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSED = 2

  static instances: MockEventSource[] = []

  readyState = MockEventSource.OPEN
  private listeners = new Map<string, Array<(e: { data: string }) => void>>()

  url: string
  withCredentials: boolean

  onerror: ((e: Event) => void) | null = null
  onopen: (() => void) | null = null

  constructor(url: string, opts?: EventSourceInit) {
    this.url = url
    this.withCredentials = opts?.withCredentials ?? false
    MockEventSource.instances.push(this)
    queueMicrotask(() => this.onopen?.())
  }

  addEventListener(type: string, fn: (e: { data: string }) => void): void {
    if (!this.listeners.has(type)) this.listeners.set(type, [])
    this.listeners.get(type)!.push(fn)
  }

  removeEventListener(type: string, fn: (e: { data: string }) => void): void {
    const arr = this.listeners.get(type) ?? []
    this.listeners.set(
      type,
      arr.filter((f) => f !== fn),
    )
  }

  dispatchEvent(type: string, data: unknown): void {
    const payload = { data: JSON.stringify(data) }
    this.listeners.get(type)?.forEach((listener) => listener(payload))
  }

  simulateError(readyState = MockEventSource.CLOSED): void {
    this.readyState = readyState
    this.onerror?.(new Event('error'))
  }

  close(): void {
    this.readyState = MockEventSource.CLOSED
  }

  static reset(): void {
    MockEventSource.instances = []
  }
}
