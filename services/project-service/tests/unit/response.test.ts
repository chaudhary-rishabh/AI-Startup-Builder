import { describe, expect, it } from 'vitest'

import { accepted, err, ok } from '../../src/lib/response.js'

describe('response helpers', () => {
  it('ok returns 200 with envelope', () => {
    const c = {
      get: () => 'rid',
      json: (body: unknown, status?: number) =>
        new Response(JSON.stringify(body), { status: status ?? 200 }),
    }
    const res = ok(c as never, { a: 1 })
    expect(res.status).toBe(200)
  })

  it('err with details returns 422', () => {
    const c = {
      get: () => 'rid',
      json: (body: unknown, status?: number) =>
        new Response(JSON.stringify(body), { status: status ?? 200 }),
    }
    const res = err(c as never, 422, 'X', 'msg', [{ field: 'a', message: 'bad' }])
    expect(res.status).toBe(422)
  })

  it('accepted returns 202', () => {
    const c = {
      get: () => 'rid',
      json: (body: unknown, status?: number) =>
        new Response(JSON.stringify(body), { status: status ?? 200 }),
    }
    const res = accepted(c as never, { jobId: 'j' })
    expect(res.status).toBe(202)
  })
})
