import type { AppState } from '../types'

export interface MaintenanceResult {
  kcal: number
  formulaKcal: number
  adjusted: boolean
  daysUsed: number
  label: string
  confidence: 'formula' | 'low' | 'medium' | 'high'
  trend: 'gaining' | 'losing' | 'stable' | 'unknown'
  weeklyChangeKg: number | null
}

export function calcMaintenance(state: AppState): MaintenanceResult {
  const { profile, weeklyVolume, metricHistory } = state

  // Mifflin-St Jeor BMR — male, typical age 28
  const bmr = 10 * profile.weight + 6.25 * profile.height - 135

  // Activity factor derived from logged weekly training volume (kg·reps)
  const totalVol = weeklyVolume.reduce((s, v) => s + v, 0)
  let act: number
  if (totalVol < 8000)       act = 1.20  // sedentary / no training
  else if (totalVol < 22000) act = 1.375 // light
  else if (totalVol < 50000) act = 1.55  // moderate
  else if (totalVol < 85000) act = 1.725 // very active
  else                       act = 1.90  // extreme

  // Experience nudge
  if (profile.exp === 'advanced')   act = Math.min(act + 0.075, 1.9)
  else if (profile.exp === 'beginner') act = Math.max(act - 0.075, 1.2)

  const formulaKcal = Math.round(bmr * act)

  // ── Adaptive section: weight-trend regression ──────────────────────────
  const sorted = [...metricHistory]
    .filter(e => e.weight > 0)
    .sort((a, b) => a.date.localeCompare(b.date))

  if (sorted.length < 5 || !profile.calorieTarget) {
    return {
      kcal: formulaKcal,
      formulaKcal,
      adjusted: false,
      daysUsed: sorted.length,
      label: 'Mifflin-St Jeor + volume',
      confidence: 'formula',
      trend: 'unknown',
      weeklyChangeKg: null,
    }
  }

  const n   = Math.min(sorted.length, 30)
  const rec = sorted.slice(-n)

  // Ordinary least-squares slope (kg / day)
  const mx = (n - 1) / 2
  const my = rec.reduce((s, e) => s + e.weight, 0) / n
  const slope =
    rec.reduce((s, e, i) => s + (i - mx) * (e.weight - my), 0) /
    rec.reduce((s, _, i) => s + (i - mx) ** 2, 0)

  const weeklyChangeKg = Math.round(slope * 7 * 100) / 100 // kg/week, 2 dp

  // What the user IS eating adjusted by the measured surplus/deficit
  const dailySurplus  = slope * 7700           // kcal/day (positive = surplus)
  const dataTDEE      = Math.round(profile.calorieTarget - dailySurplus)

  // Blend weight: grows from 50 % at 5 days to 85 % at 30 days
  const dataW   = 0.50 + Math.min((n - 5) / 25, 1) * 0.35
  const blended = Math.round(formulaKcal * (1 - dataW) + dataTDEE * dataW)

  // Sanity cap: ±700 kcal from formula
  const kcal = Math.max(formulaKcal - 700, Math.min(formulaKcal + 700, blended))

  const trend: MaintenanceResult['trend'] =
    weeklyChangeKg >  0.1 ? 'gaining' :
    weeklyChangeKg < -0.1 ? 'losing'  : 'stable'

  const confidence: MaintenanceResult['confidence'] =
    n >= 21 ? 'high' :
    n >= 10 ? 'medium' : 'low'

  return {
    kcal,
    formulaKcal,
    adjusted: true,
    daysUsed: n,
    label: `${n}-day adaptive`,
    confidence,
    trend,
    weeklyChangeKg,
  }
}
