export class AppError extends Error {
  public readonly code: string
  public readonly status: number
  public readonly context?: Record<string, unknown>

  constructor(code: string, message: string, status = 400, context?: Record<string, unknown>) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.status = status
    if (context !== undefined) this.context = context
  }
}
