import React, { createContext, useContext, useState, useCallback } from 'react'
import { AppState } from '../types'

const DEFAULT_STATE: AppState = {
  profile: { name: 'Alex', weight: 84.2, height: 181, goal: 'bulk', exp: 'advanced', calorieTarget: 2600, proteinTarget: 195 },
  today: {
    meals: [
      { name: 'Breakfast', icon: '🥚', items: '5 eggs · rice cakes · banana', kcal: 578, p: 42, c: 58, f: 18 },
      { name: 'Lunch', icon: '🍗', items: 'Chicken · brown rice · broccoli', kcal: 612, p: 58, c: 72, f: 9 },
    ],
    suppsTaken: ['Creatine', 'Omega-3'],
    exercisesCompleted: [],
  },
  recovery: { score: 87, hrv: 62, sleep: 7.4, rhr: 48, hrvHistory: [54, 68, 51, 74, 70, 62, 62] },
  weeklyVolume: [18200, 22400, 0, 24180, 0, 0, 0],
  wearables: [
    { name: 'WHOOP 4.0', icon: '⌚', synced: true, detail: 'Synced · 2 min ago' },
    { name: 'Apple Watch', icon: '🍎', synced: true, detail: 'Live' },
    { name: 'Oura Ring', icon: '💍', synced: false, detail: 'Tap to connect' },
    { name: 'Garmin', icon: '⌚', synced: false, detail: 'Tap to connect' },
  ],
  workoutPlan: [
    { day: 'MON', name: 'Pull A', muscle: 'Back · Biceps · Rear delts', type: 'pull', done: true },
    { day: 'TUE', name: 'Push A', muscle: 'Chest · Shoulders · Triceps', type: 'push', done: false, isToday: true },
    { day: 'WED', name: 'Legs A', muscle: 'Quads · Hams · Glutes · Calves', type: 'legs', done: false },
    { day: 'THU', name: 'Active Rest', muscle: 'Mobility · light cardio', type: 'rest', done: false },
    { day: 'FRI', name: 'Push B', muscle: 'Chest · Shoulders · Triceps', type: 'push', done: false },
    { day: 'SAT', name: 'Pull B', muscle: 'Back · Biceps · Rear delts', type: 'pull', done: false },
    { day: 'SUN', name: 'Rest', muscle: 'Full recovery', type: 'rest', done: false },
  ],
  todayExercises: [
    { id: 'ex1', name: 'Flat Barbell Bench Press', sets: 4, reps: '6–8', weight: 102.5, restSec: 180, sets_logged: [] },
    { id: 'ex2', name: 'Incline DB Press', sets: 3, reps: '8–10', weight: 36, restSec: 120, sets_logged: [] },
    { id: 'ex3', name: 'Overhead Press', sets: 4, reps: '6–8', weight: 75, restSec: 180, sets_logged: [] },
    { id: 'ex4', name: 'Lateral Raises', sets: 4, reps: '12–15', weight: 13, restSec: 90, sets_logged: [] },
    { id: 'ex5', name: 'Cable Flyes', sets: 3, reps: '12–15', weight: 15, restSec: 90, sets_logged: [] },
    { id: 'ex6', name: 'Tricep Pushdowns', sets: 4, reps: '10–12', weight: 30, restSec: 60, sets_logged: [] },
    { id: 'ex7', name: 'Overhead Tricep Ext.', sets: 3, reps: '10–12', weight: 20, restSec: 60, sets_logged: [] },
  ],
  supplements: [
    { icon: '⚡', name: 'Creatine', dose: '5g / day', desc: 'ATP regeneration, strength & hypertrophy', time: 'morning' },
    { icon: '🌊', name: 'Omega-3', dose: '3g EPA+DHA', desc: 'Inflammation, joint health, recovery', time: 'morning' },
    { icon: '☀️', name: 'D3 + K2', dose: '5,000 IU D3', desc: 'Hormonal support, immune, bone density', time: 'morning' },
    { icon: '💥', name: 'Beta-Alanine', dose: '3.2g pre-workout', desc: 'Endurance, lactic acid buffer', time: 'preworkout' },
    { icon: '🫀', name: 'Magnesium', dose: '400mg glycinate', desc: 'Deep sleep quality, muscle relaxation', time: 'night' },
    { icon: '🥛', name: 'Casein Protein', dose: '30–40g / night', desc: 'Slow-release MPS during sleep', time: 'night' },
  ],
  peptides: [
    { name: 'BPC-157', cls: 'Systemic · Research compound', dose: '250–500mcg/day', route: 'SubQ / Oral', cycle: '4–6 weeks on/off', half: '~4 hours' },
    { name: 'CJC-1295 + Ipamorelin', cls: 'GH Secretagogue · Research compound', dose: '100mcg / 200mcg', route: 'SubQ pre-sleep', cycle: '3 months on/off', half: '~hours' },
  ],
  muscleFatigue: [
    { name: 'Chest', level: 3 }, { name: 'Shoulders', level: 2 }, { name: 'Triceps', level: 2 },
    { name: 'Back', level: 1 }, { name: 'Biceps', level: 1 }, { name: 'Quads', level: 1 },
    { name: 'Hamstrings', level: 1 }, { name: 'Glutes', level: 1 }, { name: 'Calves', level: 1 },
  ],
  metricHistory: [],
  activeSplitId: '',
  darkMode: false,
  weightUnit: 'kg',
  heightUnit: 'cm',
}

function loadState(): AppState {
  try {
    const saved = localStorage.getItem('apex_state')
    if (saved) {
      const parsed = JSON.parse(saved)
      // Merge with defaults to pick up any new fields added since last save
      return {
        ...DEFAULT_STATE,
        ...parsed,
        metricHistory: parsed.metricHistory ?? [],
        activeSplitId: parsed.activeSplitId ?? '',
        darkMode: parsed.darkMode ?? false,
        weightUnit: parsed.weightUnit ?? 'kg',
        heightUnit: parsed.heightUnit ?? 'cm',
        }
    }
  } catch {}
  return JSON.parse(JSON.stringify(DEFAULT_STATE))
}

interface AppContextValue {
  state: AppState
  setState: (updater: (prev: AppState) => AppState) => void
  save: (newState: AppState) => void
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setStateRaw] = useState<AppState>(loadState)

  const save = useCallback((newState: AppState) => {
    try { localStorage.setItem('apex_state', JSON.stringify(newState)) } catch {}
    setStateRaw(newState)
  }, [])

  const setState = useCallback((updater: (prev: AppState) => AppState) => {
    setStateRaw(prev => {
      const next = updater(prev)
      try { localStorage.setItem('apex_state', JSON.stringify(next)) } catch {}
      return next
    })
  }, [])

  return (
    <AppContext.Provider value={{ state, setState, save }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
