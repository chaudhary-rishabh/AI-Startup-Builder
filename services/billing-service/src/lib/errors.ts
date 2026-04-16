export class AppError extends Error {
  code: string
  status: number
  context?: Record<string, unknown>

  constructor(code: string, message: string, status = 400, context?: Record<string, unknown>) {
    super(message)
    this.code = code
    this.status = status
    if (context !== undefined) this.context = context
  }
}
