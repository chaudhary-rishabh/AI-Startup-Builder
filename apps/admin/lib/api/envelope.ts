export function unwrap<T>(body: unknown): T {
  if (
    typeof body === 'object' &&
    body !== null &&
    'success' in body &&
    (body as { success: boolean }).success === true &&
    'data' in body
  ) {
    return (body as { data: T }).data
  }
  throw new Error('Unexpected API response')
}
