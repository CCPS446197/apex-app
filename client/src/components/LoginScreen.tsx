import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function LoginScreen() {
  const [mode, setMode]         = useState<'signin' | 'signup'>('signin')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [checkEmail, setCheckEmail] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message)
      else setCheckEmail(true)
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
    }

    setLoading(false)
  }

  if (checkEmail) {
    return (
      <div style={styles.wrap}>
        <div style={styles.card}>
          <div style={styles.wordmark}>APEX</div>
          <div style={styles.checkIcon}>✉</div>
          <h2 style={styles.heading}>Check your email</h2>
          <p style={styles.sub}>
            We sent a verification link to<br />
            <strong style={{ color: 'var(--copper, #B8864E)' }}>{email}</strong>
          </p>
          <p style={{ ...styles.sub, marginTop: 12, fontSize: 12 }}>
            Click the link in the email to activate your account, then come back and sign in.
          </p>
          <button style={styles.link} onClick={() => { setCheckEmail(false); setMode('signin') }}>
            Back to sign in
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.card}>
        <div style={styles.wordmark}>APEX</div>
        <div style={styles.tagline}>AI Fitness Coach</div>

        <h2 style={styles.heading}>
          {mode === 'signin' ? 'Welcome back' : 'Create account'}
        </h2>

        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={styles.input}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={6}
            style={styles.input}
          />

          {error && <div style={styles.error}>{error}</div>}

          <button type="submit" disabled={loading} style={styles.btn}>
            {loading ? '...' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <div style={styles.toggle}>
          {mode === 'signin' ? (
            <>Don't have an account?{' '}
              <button style={styles.link} onClick={() => { setMode('signup'); setError('') }}>Sign up</button>
            </>
          ) : (
            <>Already have an account?{' '}
              <button style={styles.link} onClick={() => { setMode('signin'); setError('') }}>Sign in</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    position: 'fixed', inset: 0,
    background: '#1A1714',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%', maxWidth: 360,
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: 0,
  },
  wordmark: {
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    fontSize: 42, fontWeight: 300, letterSpacing: 10,
    color: '#F5F0E8', marginBottom: 4,
  },
  tagline: {
    fontSize: 11, letterSpacing: 3, textTransform: 'uppercase',
    color: 'rgba(245,240,232,0.35)', marginBottom: 40,
  },
  checkIcon: {
    fontSize: 48, marginBottom: 16,
  },
  heading: {
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    fontSize: 26, fontWeight: 300, color: '#F5F0E8',
    margin: '0 0 24px', textAlign: 'center',
  },
  sub: {
    fontSize: 14, color: 'rgba(245,240,232,0.5)',
    textAlign: 'center', lineHeight: 1.6, margin: 0,
  },
  form: {
    width: '100%', display: 'flex', flexDirection: 'column', gap: 12,
  },
  input: {
    width: '100%', padding: '14px 16px',
    background: 'rgba(245,240,232,0.06)',
    border: '1px solid rgba(245,240,232,0.12)',
    borderRadius: 12, color: '#F5F0E8', fontSize: 15,
    outline: 'none', boxSizing: 'border-box',
  },
  error: {
    fontSize: 13, color: '#C24A3A',
    background: 'rgba(194,74,58,0.1)',
    border: '1px solid rgba(194,74,58,0.2)',
    borderRadius: 8, padding: '8px 12px',
    textAlign: 'center',
  },
  btn: {
    width: '100%', padding: '14px',
    background: '#B8864E', border: 'none', borderRadius: 12,
    color: '#1A1714', fontSize: 15, fontWeight: 700,
    cursor: 'pointer', marginTop: 4, letterSpacing: 0.5,
  },
  toggle: {
    marginTop: 24, fontSize: 13,
    color: 'rgba(245,240,232,0.4)',
    textAlign: 'center',
  },
  link: {
    background: 'none', border: 'none', padding: 0,
    color: '#B8864E', fontSize: 13, cursor: 'pointer',
    textDecoration: 'underline',
  },
}
