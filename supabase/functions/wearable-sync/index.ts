/**
 * APEX — Wearable auto-sync Edge Function
 *
 * Runs on a cron schedule (configured in supabase/functions/wearable-sync/config.toml).
 * Calls the Flask backend's internal sync endpoint so WHOOP/Oura data is fresh
 * every morning before the user opens the app.
 *
 * Required Supabase secrets (set via `supabase secrets set`):
 *   APEX_API_URL       — your production backend URL, e.g. https://apex.railway.app
 *   APEX_INTERNAL_SECRET — must match APEX_INTERNAL_SECRET in backend .env
 */

Deno.serve(async (_req) => {
  const apiUrl    = Deno.env.get('APEX_API_URL')
  const secret    = Deno.env.get('APEX_INTERNAL_SECRET')

  if (!apiUrl || !secret) {
    return new Response(
      JSON.stringify({ error: 'APEX_API_URL or APEX_INTERNAL_SECRET not set' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }

  try {
    const res = await fetch(`${apiUrl}/api/internal/sync-all`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Apex-Secret': secret,
      },
    })

    const data = await res.json()
    console.log('Wearable sync result:', JSON.stringify(data))

    return new Response(JSON.stringify(data), {
      status: res.status,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Wearable sync failed:', err)
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }
})
