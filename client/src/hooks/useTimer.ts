import { useState, useRef, useCallback } from 'react'

export type TimerState = 'idle' | 'running' | 'paused' | 'done'

export function useTimer(initial = 90) {
  const [value, setValue] = useState(initial)
  const [state, setState] = useState<TimerState>('idle')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fmt = (s: number) =>
    String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0')

  const clear = () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = null
  }

  const setDuration = useCallback((s: number) => {
    clear()
    setValue(s)
    setState('idle')
  }, [])

  const toggle = useCallback(() => {
    setState(prev => {
      if (prev === 'running') {
        clear()
        return 'paused'
      }
      if (prev === 'done') {
        setValue(90)
        return 'idle'
      }
      // idle or paused → start
      intervalRef.current = setInterval(() => {
        setValue(v => {
          if (v <= 1) {
            clear()
            setState('done')
            try { navigator.vibrate && navigator.vibrate([200, 100, 200]) } catch {}
            return 0
          }
          return v - 1
        })
      }, 1000)
      return 'running'
    })
  }, [])

  const startWith = useCallback((s: number) => {
    clear()
    setValue(s)
    intervalRef.current = setInterval(() => {
      setValue(v => {
        if (v <= 1) {
          clear()
          setState('done')
          try { navigator.vibrate && navigator.vibrate([200, 100, 200]) } catch {}
          return 0
        }
        return v - 1
      })
    }, 1000)
    setState('running')
  }, [])

  const displayText = state === 'done' ? 'GO' : fmt(value)

  return { value, state, displayText, setDuration, toggle, startWith }
}
