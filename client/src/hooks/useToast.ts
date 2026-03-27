import { useState, useCallback, useRef } from 'react'

export function useToast() {
  const [message, setMessage] = useState('')
  const [visible, setVisible] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = useCallback((msg: string, dur = 2200) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setMessage(msg)
    setVisible(true)
    timerRef.current = setTimeout(() => setVisible(false), dur)
  }, [])

  return { message, visible, showToast }
}
