export interface Meal {
  name: string
  icon: string
  items: string
  kcal: number
  p: number
  c: number
  f: number
}

export interface Wearable {
  name: string
  icon: string
  synced: boolean
  detail: string
}

export type WorkoutType = 'pull' | 'push' | 'legs' | 'upper' | 'lower' | 'full' | 'rest'

export interface WorkoutDay {
  day: string
  name: string
  muscle: string
  type: WorkoutType
  done: boolean
  isToday?: boolean
  exercises?: Exercise[]   // per-day exercise plan (no sets_logged)
}

export interface SetLog {
  weight: number
  reps: number
  notes: string
}

export interface Exercise {
  id: string
  name: string
  sets: number
  reps: string
  weight: number
  restSec: number
  sets_logged: SetLog[]
}

export interface Supplement {
  icon: string
  name: string
  dose: string
  desc: string
  time: string
}

export interface Peptide {
  name: string
  cls: string
  dose: string
  route: string
  cycle: string
  half: string
}

export interface MuscleFatigue {
  name: string
  level: number
}

export interface Recovery {
  score: number
  hrv: number
  sleep: number
  rhr: number
  hrvHistory: number[]
}

export interface Profile {
  name: string
  age: number
  weight: number
  height: number
  goal: 'bulk' | 'cut' | 'maintain'
  exp: string
  calorieTarget: number
  proteinTarget: number
}

export interface Today {
  meals: Meal[]
  suppsTaken: string[]
  exercisesCompleted: string[]
}

export type Page = 'home' | 'train' | 'ai' | 'recovery' | 'nutrition' | 'supp'

export interface WhoopStatus {
  configured: boolean
  connected: boolean
  redirect_uri: string
  last_synced: string | null
}

export interface MetricEntry {
  date: string      // ISO date string YYYY-MM-DD
  hrv: number
  sleep: number
  rhr: number
  weight: number
  score: number
}

export interface AppState {
  profile: Profile
  today: Today
  recovery: Recovery
  weeklyVolume: number[]
  wearables: Wearable[]
  workoutPlan: WorkoutDay[]
  todayExercises: Exercise[]
  supplements: Supplement[]
  peptides: Peptide[]
  muscleFatigue: MuscleFatigue[]
  metricHistory: MetricEntry[]   // one entry per day, keyed by date
  activeSplitId: string          // which split template is loaded
  darkMode: boolean
  weightUnit: 'kg' | 'lbs'
  heightUnit: 'cm' | 'ft'
}
