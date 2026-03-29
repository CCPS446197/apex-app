/**
 * useAppleHealth — reads HRV, RHR, and sleep from Apple HealthKit via Capacitor.
 * Only runs on native iOS; returns null on web/Android so callers can degrade gracefully.
 */
import { Capacitor } from '@capacitor/core'
import { CapacitorHealthkit, SampleNames } from '@perfood/capacitor-healthkit'

export interface AppleHealthData {
  hrv?: number
  rhr?: number
  sleep_hours?: number
  hrv_history?: number[]
}

const READ_TYPES = [
  SampleNames.HEART_RATE_VARIABILITY_SDNN,
  SampleNames.RESTING_HEART_RATE,
  SampleNames.SLEEP_ANALYSIS,
]

export async function requestAppleHealthPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false
  try {
    await CapacitorHealthkit.requestAuthorization({ all: [], read: READ_TYPES, write: [] })
    return true
  } catch {
    return false
  }
}

export async function readAppleHealth(): Promise<AppleHealthData | null> {
  if (!Capacitor.isNativePlatform()) return null

  const now     = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const dayAgo  = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const result: AppleHealthData = {}

  try {
    // HRV (last 7 days for history + today's value)
    const hrvRes = await CapacitorHealthkit.queryHKitSampleType({
      sampleName:    SampleNames.HEART_RATE_VARIABILITY_SDNN,
      startDate:     weekAgo.toISOString(),
      endDate:       now.toISOString(),
      limit:         7,
      ascending:     false,
    })
    const hrvSamples = hrvRes.resultData ?? []
    if (hrvSamples.length > 0) {
      result.hrv         = Math.round(hrvSamples[0].value)
      result.hrv_history = [...hrvSamples].reverse().map(s => Math.round(s.value))
    }

    // Resting heart rate (most recent)
    const rhrRes = await CapacitorHealthkit.queryHKitSampleType({
      sampleName: SampleNames.RESTING_HEART_RATE,
      startDate:  dayAgo.toISOString(),
      endDate:    now.toISOString(),
      limit:      1,
      ascending:  false,
    })
    const rhrSamples = rhrRes.resultData ?? []
    if (rhrSamples.length > 0) {
      result.rhr = Math.round(rhrSamples[0].value)
    }

    // Sleep (last night)
    const sleepRes = await CapacitorHealthkit.queryHKitSampleType({
      sampleName: SampleNames.SLEEP_ANALYSIS,
      startDate:  dayAgo.toISOString(),
      endDate:    now.toISOString(),
      limit:      0,      // all samples from last night
      ascending:  true,
    })
    const sleepSamples = sleepRes.resultData ?? []
    // Sum all 'asleep' stage durations
    const asleepMs = sleepSamples
      .filter((s: any) => s.value === 'ASLEEP' || s.value === 1)
      .reduce((acc: number, s: any) => {
        const start = new Date(s.startDate).getTime()
        const end   = new Date(s.endDate).getTime()
        return acc + (end - start)
      }, 0)
    if (asleepMs > 0) {
      result.sleep_hours = Math.round((asleepMs / 3_600_000) * 10) / 10
    }
  } catch {
    return null
  }

  return result
}
