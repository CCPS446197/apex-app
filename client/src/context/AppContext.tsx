import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { AppState } from '../types'
import { useAuth } from './AuthContext'
import { loadUserData, saveProfile, saveAppState, saveDailyLog } from '../lib/db'

const DEFAULT_STATE: AppState = {
  profile: { name: '', age: 25, weight: 80, height: 175, goal: 'bulk', exp: 'intermediate', calorieTarget: 2500, proteinTarget: 160 },
  today: { meals: [], suppsTaken: [], exercisesCompleted: [] },
  recovery: { score: 0, hrv: 0, sleep: 0, rhr: 0, hrvHistory: [0, 0, 0, 0, 0, 0, 0] },
  weeklyVolume: [0, 0, 0, 0, 0, 0, 0],
  wearables: [],
  workoutPlan: [],
  todayExercises: [],
  supplements: [],
  peptides: [],
  muscleFatigue: [
    { name: 'Chest', level: 0 }, { name: 'Shoulders', level: 0 }, { name: 'Triceps', level: 0 },
    { name: 'Back', level: 0 }, { name: 'Biceps', level: 0 }, { name: 'Quads', level: 0 },
    { name: 'Hamstrings', level: 0 }, { name: 'Glutes', level: 0 }, { name: 'Calves', level: 0 },
  ],
  metricHistory: [],
  activeSplitId: '',
  darkMode: false,
  weightUnit: 'kg',
  heightUnit: 'cm',
}

function fromSupabase(profile: any, appState: any, todayLog: any, metrics: any[]): AppState {
  const s: AppState = JSON.parse(JSON.stringify(DEFAULT_STATE))

  if (profile) {
    s.profile = {
      name:          profile.name          ?? '',
      age:           profile.age           ?? 25,
      weight:        profile.weight        ?? 80,
      height:        profile.height        ?? 175,
      goal:          profile.goal          ?? 'bulk',
      exp:           profile.exp           ?? 'intermediate',
      calorieTarget: profile.calorie_target ?? 2500,
      proteinTarget: profile.protein_target ?? 160,
    }
    s.darkMode    = profile.dark_mode   ?? false
    s.weightUnit  = profile.weight_unit ?? 'kg'
    s.heightUnit  = profile.height_unit ?? 'cm'
    s.supplements = profile.supplements ?? []
    s.peptides    = profile.peptides    ?? []
  }

  if (appState) {
    s.workoutPlan    = appState.workout_plan    ?? []
    s.todayExercises = appState.today_exercises ?? []
    s.weeklyVolume   = appState.weekly_volume   ?? [0,0,0,0,0,0,0]
    s.muscleFatigue  = appState.muscle_fatigue  ?? DEFAULT_STATE.muscleFatigue
    s.activeSplitId  = appState.active_split_id ?? ''
    s.recovery       = appState.recovery        ?? DEFAULT_STATE.recovery
    s.wearables      = appState.wearables       ?? []
  }

  if (todayLog) {
    s.today = {
      meals:              todayLog.meals              ?? [],
      suppsTaken:         todayLog.supps_taken        ?? [],
      exercisesCompleted: todayLog.exercises_completed ?? [],
    }
  }

  if (metrics.length) {
    s.metricHistory = metrics.map(m => ({
      date:   m.date,
      hrv:    m.hrv    ?? 0,
      sleep:  m.sleep  ?? 0,
      rhr:    m.rhr    ?? 0,
      weight: m.weight ?? 0,
      score:  m.score  ?? 0,
    }))
  }

  return s
}

interface AppContextValue {
  state: AppState
  setState: (updater: (prev: AppState) => AppState) => void
  save: (newState: AppState) => void
  reload: () => Promise<void>
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [state, setStateRaw] = useState<AppState>(() => {
    try {
      const saved = localStorage.getItem('apex_state')
      if (saved) return { ...DEFAULT_STATE, ...JSON.parse(saved) }
    } catch {}
    return { ...DEFAULT_STATE }
  })
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const today = new Date().toISOString().split('T')[0]

  const applySupabaseData = useCallback((profile: any, appState: any, todayLog: any, metrics: any[]) => {
    const loaded = fromSupabase(profile, appState, todayLog, metrics)
    setStateRaw(loaded)
    try { localStorage.setItem('apex_state', JSON.stringify(loaded)) } catch {}
  }, [])

  // Reload from Supabase — exposed so callers (e.g. after onboarding) can trigger it
  const reload = useCallback(async () => {
    if (!user) return
    const { profile, appState, todayLog, metrics } = await loadUserData(user.id)
    applySupabaseData(profile, appState, todayLog, metrics)
  }, [user?.id, applySupabaseData])

  // On login, load from Supabase silently in background (localStorage is shown instantly)
  useEffect(() => {
    if (!user) return
    loadUserData(user.id).then(({ profile, appState, todayLog, metrics }) => {
      applySupabaseData(profile, appState, todayLog, metrics)
    })
  }, [user?.id, applySupabaseData])

  const syncToSupabase = useCallback(async (s: AppState, userId: string) => {
    await Promise.all([
      saveProfile(userId, {
        name:           s.profile.name,
        age:            s.profile.age,
        weight:         s.profile.weight,
        height:         s.profile.height,
        goal:           s.profile.goal,
        exp:            s.profile.exp,
        calorie_target: s.profile.calorieTarget,
        protein_target: s.profile.proteinTarget,
        weight_unit:    s.weightUnit,
        height_unit:    s.heightUnit,
        dark_mode:      s.darkMode,
        supplements:    s.supplements,
        peptides:       s.peptides,
        onboarded:      true,
      }),
      saveAppState(userId, {
        workout_plan:    s.workoutPlan,
        today_exercises: s.todayExercises,
        weekly_volume:   s.weeklyVolume,
        muscle_fatigue:  s.muscleFatigue,
        active_split_id: s.activeSplitId,
        recovery:        s.recovery,
        wearables:       s.wearables,
      }),
      saveDailyLog(userId, today, {
        meals:               s.today.meals,
        supps_taken:         s.today.suppsTaken,
        exercises_completed: s.today.exercisesCompleted,
      }),
    ])
  }, [today])

  const setState = useCallback((updater: (prev: AppState) => AppState) => {
    setStateRaw(prev => {
      const next = updater(prev)
      try {
        localStorage.setItem('apex_state', JSON.stringify(next))
      } catch (e) {
        // QuotaExceededError — trim metric history and retry once
        if (e instanceof DOMException && e.name === 'QuotaExceededError') {
          try {
            const trimmed = { ...next, metricHistory: next.metricHistory.slice(-30) }
            localStorage.setItem('apex_state', JSON.stringify(trimmed))
          } catch { /* storage fully unavailable — Supabase is the fallback */ }
        }
      }
      if (user?.id) {
        if (saveTimer.current) clearTimeout(saveTimer.current)
        saveTimer.current = setTimeout(() => syncToSupabase(next, user.id), 1500)
      }
      return next
    })
  }, [user?.id, syncToSupabase])

  const save = useCallback((newState: AppState) => {
    try { localStorage.setItem('apex_state', JSON.stringify(newState)) } catch {}
    setStateRaw(newState)
    if (user?.id) syncToSupabase(newState, user.id)
  }, [user?.id, syncToSupabase])

  return (
    <AppContext.Provider value={{ state, setState, save, reload }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
