// Shared by the spec files.
export const BASE = 'http://localhost:4999'

// Back to the mock's start state, so every spec file begins with the same three tasks.
export async function resetMock() {
  const response = await fetch(`${BASE}/api/__reset`, { method: 'POST' })
  if (!response.ok) throw new Error(`mock reset failed: ${response.status}`)
}
