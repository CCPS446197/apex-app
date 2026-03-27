import { useState, useEffect } from 'react'

export default function StatusBar() {
  const [time, setTime] = useState(() => {
    const n = new Date()
    return n.getHours() + ':' + String(n.getMinutes()).padStart(2, '0')
  })

  useEffect(() => {
    const id = setInterval(() => {
      const n = new Date()
      setTime(n.getHours() + ':' + String(n.getMinutes()).padStart(2, '0'))
    }, 10000)
    return () => clearInterval(id)
  }, [])

  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
  if (isStandalone) return null

  return (
    <div className="status-bar">
      <span className="status-time">{time}</span>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', opacity: .8 }}>
        <svg width="16" height="12" viewBox="0 0 16 12">
          <rect x="0" y="3" width="3" height="9" rx="1" fill="currentColor"/>
          <rect x="4.5" y="2" width="3" height="10" rx="1" fill="currentColor"/>
          <rect x="9" y="0" width="3" height="12" rx="1" fill="currentColor"/>
          <rect x="13.5" y="0" width="2.5" height="12" rx="1" fill="currentColor" opacity=".3"/>
        </svg>
        <svg width="16" height="12" viewBox="0 0 16 12">
          <ellipse cx="8" cy="6" rx="7.5" ry="5.5" fill="none" stroke="currentColor" strokeWidth="1.2"/>
          <ellipse cx="8" cy="6" rx="5" ry="3.8" fill="none" stroke="currentColor" strokeWidth="1.2"/>
          <circle cx="8" cy="6" r="1.5" fill="currentColor"/>
        </svg>
        <svg width="25" height="12" viewBox="0 0 25 12">
          <rect x="0.5" y="0.5" width="21" height="11" rx="3.5" fill="none" stroke="currentColor" strokeOpacity=".35"/>
          <rect x="2" y="2" width="17" height="8" rx="2" fill="currentColor"/>
          <rect x="22" y="3.5" width="2.5" height="5" rx="1.25" fill="currentColor" opacity=".4"/>
        </svg>
      </div>
    </div>
  )
}
