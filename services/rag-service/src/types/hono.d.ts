declare module 'hono' {
  interface ContextVariableMap {
    userId: string
    userRole: string
    userPlan: string
    requestId: string
  }
}

export {}
