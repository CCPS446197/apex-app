import { useState, useRef, useCallback, useEffect } from 'react'

export type TimerState = 'idle' | 'running' | 'paused' | 'done'

const STORAGE_KEY = 'apex_rest_timer'

interface PersistedTimer {
  endTime: number    // epoch ms — set when running
  remaining: number  // seconds — set when paused
  state: TimerState
}

function saveTimer(data: PersistedTimer) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)) } catch {}
}

function clearTimer() {
  try { localStorage.removeItem(STORAGE_KEY) } catch {}
}

export function useTimer(initial = 90) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Initialise from persisted state on first mount
  const [value, setValue] = useState<number>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return initial
      const p: PersistedTimer = JSON.parse(raw)
      if (p.state === 'running') {
        const remaining = Math.round((p.endTime - Date.now()) / 1000)
        return remaining > 0 ? remaining : 0
      }
      if (p.state === 'paused') return p.remaining
    } catch {}
    return initial
  })

  const [state, setState] = useState<TimerState>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return 'idle'
      const p: PersistedTimer = JSON.parse(raw)
      if (p.state === 'running') {
        const remaining = Math.round((p.endTime - Date.now()) / 1000)
        return remaining > 0 ? 'running' : 'done'
      }
      return p.state
    } catch {}
    return 'idle'
  })

  const fmt = (s: number) =>
    String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0')

  const clearInterval_ = () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = null
  }

  const startInterval = useCallback((startValue: number, endTime: number) => {
    clearInterval_()
    intervalRef.current = setInterval(() => {
      const remaining = Math.round((endTime - Date.now()) / 1000)
      if (remaining <= 0) {
        clearInterval_()
        setValue(0)
        setState('done')
        clearTimer()
        try { navigator.vibrate && navigator.vibrate([200, 100, 200]) } catch {}
      } else {
        setValue(remaining)
      }
    }, 500)  // 500 ms tick keeps display accurate after tab resumes
  }, [])

  // Auto-resume a running timer that survived a remount
  useEffect(() => {
    if (state === 'running' && value > 0) {
      const endTime = Date.now() + value * 1000
      startInterval(value, endTime)
    }
    return clearInterval_
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])  // intentionally only on mount

  const setDuration = useCallback((s: number) => {
    clearInterval_()
    clearTimer()
    setValue(s)
    setState('idle')
  }, [])

  const toggle = useCallback(() => {
    setState(prev => {
      if (prev === 'running') {
        clearInterval_()
        setValue(v => {
          saveTimer({ endTime: 0, remaining: v, state: 'paused' })
          return v
        })
        return 'paused'
      }
      if (prev === 'done') {
        clearTimer()
        setValue(90)
        return 'idle'
      }
      // idle or paused → start
      setValue(v => {
        const endTime = Date.now() + v * 1000
        saveTimer({ endTime, remaining: v, state: 'running' })
        startInterval(v, endTime)
        return v
      })
      return 'running'
    })
  }, [startInterval])

  const startWith = useCallback((s: number) => {
    clearInterval_()
    const endTime = Date.now() + s * 1000
    saveTimer({ endTime, remaining: s, state: 'running' })
    setValue(s)
    startInterval(s, endTime)
    setState('running')
  }, [startInterval])

  const displayText = state === 'done' ? 'GO' : fmt(value)

  return { value, state, displayText, setDuration, toggle, startWith }
}
