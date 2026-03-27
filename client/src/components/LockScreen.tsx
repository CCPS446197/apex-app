import { useState, useEffect } from 'react'

interface Props {
  correctPin: string
  onUnlock: () => void
}

const KEYS = ['1','2','3','4','5','6','7','8','9','⌫','0','✓']

export default function LockScreen({ correctPin, onUnlock }: Props) {
  const [entry, setEntry]     = useState('')
  const [shake, setShake]     = useState(false)
  const [error, setError]     = useState(false)

  useEffect(() => {
    if (entry.length === 4) {
      if (entry === correctPin) {
        sessionStorage.setItem('apex_unlocked', '1')
        onUnlock()
      } else {
        setShake(true)
        setError(true)
        setTimeout(() => { setShake(false); setEntry(''); setError(false) }, 700)
      }
    }
  }, [entry, correctPin, onUnlock])

  function press(key: string) {
    if (shake) return
    if (key === '⌫') {
      setEntry(e => e.slice(0, -1))
      setError(false)
    } else if (key === '✓') {
      if (entry.length === 4) {
        if (entry === correctPin) {
          sessionStorage.setItem('apex_unlocked', '1')
          onUnlock()
        } else {
          setShake(true); setError(true)
          setTimeout(() => { setShake(false); setEntry(''); setError(false) }, 700)
        }
      }
    } else if (entry.length < 4) {
      setEntry(e => e + key)
    }
  }

  return (
    <div className="lock-screen">
      <div className="lock-wordmark">APEX</div>
      <div className="lock-subtitle">Enter your PIN to continue</div>

      <div className={`lock-dots${shake ? ' shake' : ''}`}>
        {[0,1,2,3].map(i => (
          <div key={i} className={`lock-dot${i < entry.length ? (error ? ' error' : ' filled') : ''}`} />
        ))}
      </div>

      {error && <div className="lock-error">Incorrect PIN</div>}
      {!error && <div className="lock-error" style={{ opacity: 0 }}>·</div>}

      <div className="lock-pad">
        {KEYS.map(k => (
          <button
            key={k}
            className={`lock-key${k === '✓' ? ' confirm' : ''}${k === '⌫' ? ' del' : ''}`}
            onClick={() => press(k)}
          >
            {k}
          </button>
        ))}
      </div>
    </div>
  )
}
