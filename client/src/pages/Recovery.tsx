import { useState, useEffect, useCallback } from 'react'
import { useApp } from '../context/AppContext'
import type { WhoopStatus } from '../types'

interface OuraStatus {
  configured: boolean
  connected: boolean
  redirect_uri: string
  last_synced: string | null
}

interface Props {
  showToast: (msg: string) => void
  onLogMetrics: () => void
}

function muscleDots(level: number) {
  const MAX = 4
  return Array.from({ length: MAX }, (_, i) => {
    const filled = i < level
    const cls = filled
      ? level >= 3 ? 'm-dot m-fatigued' : level >= 2 ? 'm-dot m-mild' : 'm-dot m-fresh'
      : 'm-dot m-empty'
    return <span key={i} className={cls} />
  })
}

function muscleStatus(level: number) {
  if (level >= 3) return <span className="muscle-status s-poor">Fatigued</span>
  if (level >= 2) return <span className="muscle-status s-fair">Mild</span>
  if (level >= 1) return <span className="muscle-status s-good">Recovered</span>
  return <span className="muscle-status s-ex">Fresh</span>
}

function fmt_time(iso: string | null) {
  if (!iso) return null
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function Recovery({ showToast, onLogMetrics }: Props) {
  const { state, setState } = useApp()
  const { recovery, muscleFatigue } = state
  const { score, hrv, sleep, rhr, hrvHistory } = recovery

  const [whoopStatus, setWhoopStatus] = useState<WhoopStatus | null>(null)
  const [ouraStatus,  setOuraStatus]  = useState<OuraStatus  | null>(null)
  const [whoopSyncing, setWhoopSyncing] = useState(false)
  const [ouraSyncing,  setOuraSyncing]  = useState(false)
  const [setupOpen, setSetupOpen] = useState<'whoop' | 'oura' | null>(null)

  const DAYS   = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const maxHrv = Math.max(...hrvHistory, 1)

  const sleepStatus = sleep >= 8 ? 's-ex' : sleep >= 7 ? 's-good' : sleep >= 6 ? 's-fair' : 's-poor'
  const sleepLabel  = sleep >= 8 ? 'Excellent' : sleep >= 7 ? 'Good' : sleep >= 6 ? 'Fair' : 'Poor'
  const rhrStatus   = rhr <= 48 ? 's-ex' : rhr <= 55 ? 's-good' : rhr <= 62 ? 's-fair' : 's-poor'
  const rhrLabel    = rhr <= 48 ? 'Excellent' : rhr <= 55 ? 'Good' : rhr <= 62 ? 'Fair' : 'Elevated'

  const headline = score >= 85
    ? <><em style={{ color: 'var(--green)' }}>is ready.</em></>
    : score >= 70
    ? <><em style={{ color: 'var(--copper)' }}>is recovering.</em></>
    : <><em style={{ color: 'var(--red)' }}>needs rest.</em></>

  // ── Fetch both wearable statuses ────────────────────────────────────────
  const fetchStatuses = useCallback(async () => {
    try {
      const [wr, or] = await Promise.all([
        fetch('/api/whoop/status', { credentials: 'include' }),
        fetch('/api/oura/status',  { credentials: 'include' }),
      ])
      if (wr.ok) setWhoopStatus(await wr.json())
      if (or.ok) setOuraStatus(await or.json())
    } catch { /* ignore */ }
  }, [])

  useEffect(() => { fetchStatuses() }, [fetchStatuses])

  // ── Listen for OAuth popups ─────────────────────────────────────────────
  useEffect(() => {
    // Only accept postMessages from our own backend origin
    const BACKEND_ORIGIN = `${window.location.protocol}//${window.location.hostname}:8000`
    function handleMessage(e: MessageEvent) {
      if (e.origin !== window.location.origin && e.origin !== BACKEND_ORIGIN) return
      if (!e.data) return
      if (e.data.type === 'whoop_oauth') {
        if (e.data.status === 'success') {
          showToast('WHOOP connected ✓')
          fetchStatuses().then(() => handleWhoopSync())
        } else showToast('WHOOP connection failed')
      }
      if (e.data.type === 'oura_oauth') {
        if (e.data.status === 'success') {
          showToast('Oura connected ✓')
          fetchStatuses().then(() => handleOuraSync())
        } else showToast('Oura connection failed')
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [fetchStatuses, showToast])

  // ── Open OAuth popup ────────────────────────────────────────────────────
  function openOAuthPopup(url: string) {
    const w = 520, h = 640
    const left = window.screen.width / 2 - w / 2
    const top  = window.screen.height / 2 - h / 2
    window.open(url, '_blank', `width=${w},height=${h},left=${left},top=${top},toolbar=no,menubar=no`)
  }

  async function handleWhoopConnect() {
    try {
      const res  = await fetch('/api/whoop/connect', { credentials: 'include' })
      const data = await res.json()
      if (!res.ok || !data.auth_url) { showToast(data.error || 'Failed to start WHOOP auth'); return }
      openOAuthPopup(data.auth_url)
    } catch { showToast('Could not reach server') }
  }

  async function handleOuraConnect() {
    try {
      const res  = await fetch('/api/oura/connect', { credentials: 'include' })
      const data = await res.json()
      if (!res.ok || !data.auth_url) { showToast(data.error || 'Failed to start Oura auth'); return }
      openOAuthPopup(data.auth_url)
    } catch { showToast('Could not reach server') }
  }

  // ── Sync helpers ────────────────────────────────────────────────────────
  async function applySync(data: any, source: string) {
    setState(prev => {
      const r    = data.recovery   || {}
      const hist = data.hrv_history || prev.recovery.hrvHistory
      return {
        ...prev,
        recovery: {
          ...prev.recovery,
          hrv:        r.hrv   ?? prev.recovery.hrv,
          rhr:        r.rhr   ?? prev.recovery.rhr,
          score:      r.score ?? prev.recovery.score,
          sleep:      data.sleep_hours ?? prev.recovery.sleep,
          hrvHistory: hist,
        },
      }
    })
    showToast(`${source} synced ✓`)
  }

  async function handleWhoopSync() {
    setWhoopSyncing(true)
    try {
      const res  = await fetch('/api/whoop/sync', { method: 'POST', credentials: 'include' })
      const data = await res.json()
      if (!res.ok) { showToast(data.error || 'WHOOP sync failed') }
      else {
        await applySync(data, 'WHOOP')
        setWhoopStatus(s => s ? { ...s, last_synced: data.last_synced } : s)
      }
    } catch { showToast('Sync error') }
    setWhoopSyncing(false)
  }

  async function handleOuraSync() {
    setOuraSyncing(true)
    try {
      const res  = await fetch('/api/oura/sync', { method: 'POST', credentials: 'include' })
      const data = await res.json()
      if (!res.ok) { showToast(data.error || 'Oura sync failed') }
      else {
        await applySync(data, 'Oura')
        setOuraStatus(s => s ? { ...s, last_synced: data.last_synced } : s)
      }
    } catch { showToast('Sync error') }
    setOuraSyncing(false)
  }

  async function handleWhoopDisconnect() {
    await fetch('/api/whoop/disconnect', { method: 'POST', credentials: 'include' })
    setWhoopStatus(s => s ? { ...s, connected: false, last_synced: null } : s)
    showToast('WHOOP disconnected')
  }

  async function handleOuraDisconnect() {
    await fetch('/api/oura/disconnect', { method: 'POST', credentials: 'include' })
    setOuraStatus(s => s ? { ...s, connected: false, last_synced: null } : s)
    showToast('Oura disconnected')
  }

  // ── Wearable row renderer ───────────────────────────────────────────────
  function WearableRow({
    icon, name, color,
    configured, connected, syncing, lastSync,
    redirectUri, setupKey,
    onConnect, onSync, onDisconnect,
  }: {
    icon: string; name: string; color: string
    configured: boolean; connected: boolean; syncing: boolean; lastSync: string | null
    redirectUri: string; setupKey: 'whoop' | 'oura'
    onConnect: () => void; onSync: () => void; onDisconnect: () => void
  }) {
    const isSetupOpen = setupOpen === setupKey
    return (
      <div style={{ borderBottom: '1px solid var(--ash3)', paddingBottom: 14, marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: connected ? `${color}18` : 'var(--ash3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
            }}>{icon}</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{name}</div>
              <div style={{ fontSize: 11, color: connected ? 'var(--green)' : 'var(--ash)' }}>
                {connected
                  ? lastSync ? `Synced at ${fmt_time(lastSync)}` : 'Connected — tap Sync'
                  : configured ? 'Not connected' : 'Setup required'}
              </div>
            </div>
          </div>
          {connected ? (
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={onSync} disabled={syncing} style={btnStyle('var(--ink)', 'var(--linen)')}>
                {syncing ? '…' : '↻ Sync'}
              </button>
              <button onClick={onDisconnect} style={btnStyle('transparent', 'var(--ash)', '1px solid var(--ash3)')}>
                ✕
              </button>
            </div>
          ) : configured ? (
            <button onClick={onConnect} style={btnStyle('var(--ink)', 'var(--linen)')}>Connect ↗</button>
          ) : (
            <button onClick={() => setSetupOpen(isSetupOpen ? null : setupKey)}
              style={btnStyle('transparent', 'var(--copper)', '1px solid rgba(184,134,78,.3)')}>
              Setup {isSetupOpen ? '↑' : '↓'}
            </button>
          )}
        </div>
        {!configured && isSetupOpen && (
          <div style={{
            marginTop: 10,
            background: 'rgba(184,134,78,.06)',
            border: '1px solid rgba(184,134,78,.2)',
            borderRadius: 12, padding: '12px 14px',
            fontSize: 12, color: 'var(--ink2)', lineHeight: 1.7,
          }}>
            <div style={{ fontWeight: 700, color: 'var(--copper)', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>
              How to connect {name}
            </div>
            {setupKey === 'whoop' ? (
              <ol style={{ margin: 0, paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 3 }}>
                <li>Go to <strong>developer.whoop.com</strong> → create a developer app</li>
                <li>Add this redirect URI: <code style={codeStyle}>{redirectUri}</code></li>
                <li>Copy Client ID + Secret → add as secrets <code>WHOOP_CLIENT_ID</code> and <code>WHOOP_CLIENT_SECRET</code></li>
                <li>Restart the server</li>
              </ol>
            ) : (
              <ol style={{ margin: 0, paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 3 }}>
                <li>Go to <strong>cloud.ouraring.com/oauth/applications</strong> → create a new application</li>
                <li>Add this redirect URI: <code style={codeStyle}>{redirectUri}</code></li>
                <li>Copy Client ID + Secret → add as secrets <code>OURA_CLIENT_ID</code> and <code>OURA_CLIENT_SECRET</code></li>
                <li>Restart the server — the Connect button will appear</li>
              </ol>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="page active">
      <div className="rec-header">
        <div className="eyebrow">Recovery Intelligence</div>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 34, fontWeight: 300, lineHeight: 1.1 }}>
          Your body<br />{headline}
        </div>
      </div>

      {/* ── Wearable Connect Block ─────────────────────────────────── */}
      <div style={{ padding: '0 20px', marginBottom: 20 }}>
        <div style={{ background: 'var(--white)', border: '1px solid var(--ash3)', borderRadius: 20, padding: '16px 16px 0' }}>
          <WearableRow
            icon="⌚" name="WHOOP" color="rgba(58,122,92)"
            configured={whoopStatus?.configured ?? false}
            connected={whoopStatus?.connected ?? false}
            syncing={whoopSyncing}
            lastSync={whoopStatus?.last_synced ?? null}
            redirectUri={whoopStatus?.redirect_uri ?? ''}
            setupKey="whoop"
            onConnect={handleWhoopConnect}
            onSync={handleWhoopSync}
            onDisconnect={handleWhoopDisconnect}
          />
          <WearableRow
            icon="💍" name="Oura Ring" color="rgba(46,95,138)"
            configured={ouraStatus?.configured ?? false}
            connected={ouraStatus?.connected ?? false}
            syncing={ouraSyncing}
            lastSync={ouraStatus?.last_synced ?? null}
            redirectUri={ouraStatus?.redirect_uri ?? ''}
            setupKey="oura"
            onConnect={handleOuraConnect}
            onSync={handleOuraSync}
            onDisconnect={handleOuraDisconnect}
          />

          {/* Manual entry row */}
          <div style={{ paddingBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 12, color: 'var(--ash)' }}>Log metrics manually</div>
            <button onClick={onLogMetrics} style={btnStyle('transparent', 'var(--ink2)', '1px solid var(--ash3)')}>
              ＋ Log metrics
            </button>
          </div>
        </div>
      </div>

      {/* ── Metric Tiles ───────────────────────────────────────────── */}
      <div className="rec-metrics">
        <div className="rec-tile">
          <div className="rec-tile-icon">⚡</div>
          <div className="rec-tile-val">{hrv}</div>
          <div className="rec-tile-lbl">HRV (ms)</div>
          <div className={`rec-tile-status ${hrv >= 70 ? 's-ex' : hrv >= 55 ? 's-good' : hrv >= 40 ? 's-fair' : 's-poor'}`}>
            {hrv >= 70 ? 'Excellent' : hrv >= 55 ? 'Good' : hrv >= 40 ? 'Fair' : 'Low'}
          </div>
        </div>
        <div className="rec-tile">
          <div className="rec-tile-icon">💤</div>
          <div className="rec-tile-val">{sleep}h</div>
          <div className="rec-tile-lbl">Sleep</div>
          <div className={`rec-tile-status ${sleepStatus}`}>{sleepLabel}</div>
        </div>
        <div className="rec-tile">
          <div className="rec-tile-icon">❤️</div>
          <div className="rec-tile-val">{rhr}</div>
          <div className="rec-tile-lbl">RHR (bpm)</div>
          <div className={`rec-tile-status ${rhrStatus}`}>{rhrLabel}</div>
        </div>
        <div className="rec-tile">
          <div className="rec-tile-icon">🎯</div>
          <div className="rec-tile-val">{score}</div>
          <div className="rec-tile-lbl">Readiness</div>
          <div className={`rec-tile-status ${score >= 85 ? 's-ex' : score >= 70 ? 's-good' : score >= 55 ? 's-fair' : 's-poor'}`}>
            {score >= 85 ? 'Optimal' : score >= 70 ? 'Good' : score >= 55 ? 'Fair' : 'Poor'}
          </div>
        </div>
      </div>

      {/* ── 7-Day HRV Chart ─────────────────────────────────────────── */}
      <div className="hrv-section">
        <div className="hrv-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <div className="eyebrow" style={{ margin: 0 }}>7-Day HRV</div>
            {(() => {
              const delta = hrv - (hrvHistory[5] || hrv)
              const sign  = delta >= 0 ? '↑' : '↓'
              const cls   = delta >= 0 ? 'pill-green' : 'pill-red'
              return (
                <span className={`pill ${cls}`}>
                  {sign} {Math.abs(delta)}ms vs yesterday
                </span>
              )
            })()}
          </div>
          <div className="hrv-graph">
            {hrvHistory.map((v, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <div style={{ fontSize: 9, color: 'var(--ash)', lineHeight: 1 }}>{v || ''}</div>
                <div
                  className="hrv-bar"
                  style={{
                    height: v > 0 ? `${(v / maxHrv) * 100}%` : '3px',
                    background: i === 6
                      ? 'var(--copper)'
                      : v >= 65 ? 'var(--green)' : v >= 50 ? 'var(--copper2)' : v > 0 ? 'rgba(194,74,58,.35)' : 'var(--ash3)',
                  }}
                />
              </div>
            ))}
          </div>
          <div className="hrv-days">
            {DAYS.map(d => <div key={d} className="hrv-day">{d[0]}</div>)}
          </div>
        </div>
      </div>

      {/* ── Muscle Fatigue Map ──────────────────────────────────────── */}
      <div style={{ padding: '0 24px', marginBottom: 20 }}>
        <div className="eyebrow">Muscle fatigue map</div>
        <div className="card" style={{ padding: '0 16px', borderRadius: 20 }}>
          {muscleFatigue.map(m => (
            <div key={m.name} className="muscle-row">
              <span className="muscle-name">{m.name}</span>
              <div className="muscle-dots">{muscleDots(m.level)}</div>
              {muscleStatus(m.level)}
            </div>
          ))}
        </div>
      </div>

      <div className="bottom-spacer" />
    </div>
  )
}

function btnStyle(bg: string, color: string, border = 'none'): React.CSSProperties {
  return {
    background: bg, color, border, borderRadius: 12,
    padding: '7px 14px', fontSize: 12, fontWeight: 600,
    cursor: 'pointer', letterSpacing: .4,
  }
}

const codeStyle: React.CSSProperties = {
  display: 'block', marginTop: 4,
  background: 'var(--ash3)', borderRadius: 8,
  padding: '5px 9px', fontSize: 10,
  fontFamily: 'monospace', wordBreak: 'break-all',
  color: 'var(--ink)',
}
