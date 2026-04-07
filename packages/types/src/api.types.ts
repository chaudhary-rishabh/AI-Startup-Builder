export interface SuccessResponse<T> {
  success: true
  data: T
  meta?: PaginationMeta
  requestId: string
  timestamp: string
}

export interface ErrorResponse {
  success: false
  error: {
    code: string
    message: string
    details?: ValidationErrorDetail[]
    traceId: string
    service: string
  }
}

export interface PaginationMeta {
  total: number
  page: number
  limit: number
  totalPages: number
  nextCursor?: string
  prevCursor?: string
}

export interface ValidationErrorDetail {
  field: string
  message: string
  received?: unknown
}

export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse
