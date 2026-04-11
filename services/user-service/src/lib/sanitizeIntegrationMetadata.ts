/**
 * Allow only safe primitives at root (max 10 keys) and one nested object level
 * with primitive values. Strips functions, arrays, and deeper nesting.
 */
export function sanitizeMetadata(raw: unknown): Record<string, unknown> {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return {}
  }
  const obj = raw as Record<string, unknown>
  const out: Record<string, unknown> = {}
  let count = 0
  for (const [k, v] of Object.entries(obj)) {
    if (count >= 10) break
    const t = typeof v
    if (t === 'string' || t === 'number' || t === 'boolean' || v === null) {
      out[k] = v
      count++
      continue
    }
    if (t === 'object' && v !== null && !Array.isArray(v)) {
      const inner = v as Record<string, unknown>
      const nested: Record<string, unknown> = {}
      for (const [ik, iv] of Object.entries(inner)) {
        const it = typeof iv
        if (it === 'string' || it === 'number' || it === 'boolean' || iv === null) {
          nested[ik] = iv
        }
      }
      if (Object.keys(nested).length > 0) {
        out[k] = nested
      }
      count++
    }
  }
  return out
}
