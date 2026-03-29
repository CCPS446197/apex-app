/**
 * Authenticated fetch wrapper.
 *
 * Attaches the current Supabase JWT as an Authorization: Bearer header so the
 * Flask backend can validate the caller.  Falls back gracefully if there is no
 * active session (e.g. during local dev without SUPABASE_JWT_SECRET configured).
 */
import { supabase } from './supabase'

export async function apiFetch(
  input: RequestInfo,
  init: RequestInit = {},
): Promise<Response> {
  const { data: { session } } = await supabase.auth.getSession()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> | undefined),
  }
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`
  }
  return fetch(input, { ...init, headers })
}
