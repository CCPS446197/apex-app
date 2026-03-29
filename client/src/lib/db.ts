import { supabase } from './supabase'

export async function loadUserData(userId: string) {
  const today = new Date().toISOString().split('T')[0]

  const [profileRes, stateRes, logRes, metricsRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).single(),
    supabase.from('app_state').select('*').eq('user_id', userId).single(),
    supabase.from('daily_logs').select('*').eq('user_id', userId).eq('date', today).single(),
    supabase.from('metric_history').select('*').eq('user_id', userId).order('date', { ascending: true }).limit(90),
  ])

  return {
    profile:  profileRes.data  ?? null,
    appState: stateRes.data    ?? null,
    todayLog: logRes.data      ?? null,
    metrics:  metricsRes.data  ?? [],
  }
}

export async function saveProfile(userId: string, data: Record<string, unknown>) {
  await supabase.from('profiles').upsert({
    id: userId,
    ...data,
    updated_at: new Date().toISOString(),
  })
}

export async function saveAppState(userId: string, data: Record<string, unknown>) {
  await supabase.from('app_state').upsert({
    user_id: userId,
    ...data,
    updated_at: new Date().toISOString(),
  })
}

export async function saveDailyLog(userId: string, date: string, data: Record<string, unknown>) {
  await supabase.from('daily_logs').upsert({ user_id: userId, date, ...data })
}

export async function saveMetricEntry(userId: string, date: string, data: Record<string, unknown>) {
  await supabase.from('metric_history').upsert({ user_id: userId, date, ...data })
}
