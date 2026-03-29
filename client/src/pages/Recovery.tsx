import { useState, useEffect, useCallback } from 'react'
import { Capacitor } from '@capacitor/core'
import { useApp } from '../context/AppContext'
import { apiFetch } from '../lib/api'
import { requestAppleHealthPermission, readAppleHealth } from '../hooks/useAppleHealth'
import type { WhoopStatus } from '../types'

interface WearableStatus {
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

  type Provider = 'whoop' | 'oura' | 'fitbit' | 'strava'
  const [whoopStatus,  setWhoopStatus]  = useState<WhoopStatus    | null>(null)
  const [ouraStatus,   setOuraStatus]   = useState<WearableStatus | null>(null)
  const [fitbitStatus, setFitbitStatus] = useState<WearableStatus | null>(null)
  const [stravaStatus, setStravaStatus] = useState<WearableStatus | null>(null)
  const [syncing, setSyncing] = useState<Provider | null>(null)
  const [patOpen,   setPatOpen]   = useState<Provider | null>(null)
  const [patToken,  setPatToken]  = useState('')
  const [patSaving, setPatSaving] = useState(false)

  // Apple Health (iOS native only)
  const isNative = Capacitor.isNativePlatform()
  const [ahConnected, setAhConnected] = useState(false)
  const [ahSyncing,   setAhSyncing]   = useState(false)

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

  // ── Fetch all wearable statuses ──────────────────────────────────────────
  const fetchStatuses = useCallback(async () => {
    try {
      const [wr, or, fr, sr] = await Promise.all([
        apiFetch('/api/whoop/status'),
        apiFetch('/api/oura/status'),
        apiFetch('/api/fitbit/status'),
        apiFetch('/api/strava/status'),
      ])
      if (wr.ok) setWhoopStatus(await wr.json())
      if (or.ok) setOuraStatus(await or.json())
      if (fr.ok) setFitbitStatus(await fr.json())
      if (sr.ok) setStravaStatus(await sr.json())
    } catch { /* ignore */ }
  }, [])

  useEffect(() => { fetchStatuses() }, [fetchStatuses])

  // ── Listen for OAuth popups ─────────────────────────────────────────────
  useEffect(() => {
    // Only accept postMessages from our own backend origin
    const BACKEND_ORIGIN = `${window.location.protocol}//${window.location.hostname}:8000`
    function handleMessage(e: MessageEvent) {
      if (e.origin !== window.location.origin && e.origin !== BACKEND_ORIGIN) return
      if (!e.data?.type) return
      const provider = e.data.type.replace('_oauth', '') as string
      if (['whoop', 'oura', 'fitbit', 'strava'].includes(provider)) {
        if (e.data.status === 'success') {
          showToast(`${PROVIDER_LABELS[provider]} connected ✓`)
          fetchStatuses().then(() => handleSync(provider))
        } else showToast(`${PROVIDER_LABELS[provider]} connection failed`)
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

  const PROVIDER_LABELS: Record<string, string> = {
    whoop: 'WHOOP', oura: 'Oura', fitbit: 'Fitbit', strava: 'Strava',
  }

  async function handleOAuthConnect(provider: string) {
    try {
      const res  = await apiFetch(`/api/${provider}/connect`)
      const data = await res.json()
      if (!res.ok || !data.auth_url) { showToast(data.error || `Failed to start ${PROVIDER_LABELS[provider]} auth`); return }
      openOAuthPopup(data.auth_url)
    } catch { showToast('Could not reach server') }
  }

  async function handlePatSave(provider: string) {
    const token = patToken.trim()
    if (!token) return
    setPatSaving(true)
    try {
      const res = await apiFetch(`/api/${provider}/pat`, {
        method: 'POST',
        body: JSON.stringify({ token }),
      })
      if (res.ok) {
        showToast(`${PROVIDER_LABELS[provider]} connected ✓`)
        setPatOpen(null)
        setPatToken('')
        fetchStatuses().then(() => handleSync(provider))
      } else {
        const d = await res.json()
        showToast(d.error || 'Failed to save token')
      }
    } catch { showToast('Could not reach server') }
    setPatSaving(false)
  }

  // ── Sync helpers ────────────────────────────────────────────────────────
  function applySync(data: any, provider: string) {
    if (provider === 'strava') {
      // Strava provides activity data, not recovery metrics
      showToast('Strava synced ✓')
      setStravaStatus(s => s ? { ...s, last_synced: data.last_synced } : s)
      return
    }
    setState(prev => ({
      ...prev,
      recovery: {
        ...prev.recovery,
        hrv:        data.recovery?.hrv   ?? prev.recovery.hrv,
        rhr:        data.recovery?.rhr   ?? prev.recovery.rhr,
        score:      data.recovery?.score ?? prev.recovery.score,
        sleep:      data.sleep_hours     ?? prev.recovery.sleep,
        hrvHistory: data.hrv_history     ?? prev.recovery.hrvHistory,
      },
    }))
    showToast(`${PROVIDER_LABELS[provider]} synced ✓`)
    if (provider === 'whoop')  setWhoopStatus(s => s ? { ...s, last_synced: data.last_synced } : s)
    if (provider === 'oura')   setOuraStatus(s => s ? { ...s, last_synced: data.last_synced } : s)
    if (provider === 'fitbit') setFitbitStatus(s => s ? { ...s, last_synced: data.last_synced } : s)
  }

  async function handleSync(provider: string) {
    setSyncing(provider as any)
    try {
      const res  = await apiFetch(`/api/${provider}/sync`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) showToast(data.error || `${PROVIDER_LABELS[provider]} sync failed`)
      else applySync(data, provider)
    } catch { showToast('Sync error') }
    setSyncing(null)
  }

  async function handleAppleHealthSync() {
    setAhSyncing(true)
    try {
      const granted = await requestAppleHealthPermission()
      if (!granted) { showToast('HealthKit permission denied'); setAhSyncing(false); return }
      const data = await readAppleHealth()
      if (!data) { showToast('Could not read Apple Health data'); setAhSyncing(false); return }
      setAhConnected(true)
      setState(prev => ({
        ...prev,
        recovery: {
          ...prev.recovery,
          hrv:        data.hrv        ?? prev.recovery.hrv,
          rhr:        data.rhr        ?? prev.recovery.rhr,
          sleep:      data.sleep_hours ?? prev.recovery.sleep,
          hrvHistory: data.hrv_history ?? prev.recovery.hrvHistory,
        },
      }))
      showToast('Apple Health synced ✓')
    } catch { showToast('Apple Health sync error') }
    setAhSyncing(false)
  }

  async function handleDisconnect(provider: string) {
    await apiFetch(`/api/${provider}/disconnect`, { method: 'POST' })
    const update = (s: any) => s ? { ...s, connected: false, last_synced: null } : s
    if (provider === 'whoop')  setWhoopStatus(update)
    if (provider === 'oura')   setOuraStatus(update)
    if (provider === 'fitbit') setFitbitStatus(update)
    if (provider === 'strava') setStravaStatus(update)
    showToast(`${PROVIDER_LABELS[provider]} disconnected`)
  }

  // ── Wearable row renderer ───────────────────────────────────────────────
  function WearableRow({
    icon, name, color, provider,
    configured, connected, lastSync,
    patUrl, hasPat = true, subtitle,
  }: {
    icon: string; name: string; color: string; provider: string
    configured: boolean; connected: boolean; lastSync: string | null
    patUrl?: string; hasPat?: boolean; subtitle?: string
  }) {
    const isPatOpen  = patOpen === provider
    const isSyncing  = syncing === provider
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
                  ? lastSync ? `Synced ${fmt_time(lastSync)}` : 'Connected — tap Sync'
                  : subtitle || 'Not connected'}
              </div>
            </div>
          </div>
          {connected ? (
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => handleSync(provider)} disabled={isSyncing}
                style={btnStyle('var(--ink)', 'var(--linen)')}>
                {isSyncing ? '…' : '↻ Sync'}
              </button>
              <button onClick={() => handleDisconnect(provider)}
                style={btnStyle('transparent', 'var(--ash)', '1px solid var(--ash3)')}>
                ✕
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 6 }}>
              {hasPat && (
                <button
                  onClick={() => { setPatOpen(isPatOpen ? null : provider as any); setPatToken('') }}
                  style={btnStyle('transparent', 'var(--copper)', '1px solid rgba(184,134,78,.3)')}
                >
                  {isPatOpen ? 'Cancel' : 'Connect ↗'}
                </button>
              )}
              {configured && !hasPat && (
                <button onClick={() => handleOAuthConnect(provider)}
                  style={btnStyle('var(--ink)', 'var(--linen)')}>Connect ↗</button>
              )}
              {configured && hasPat && (
                <button onClick={() => handleOAuthConnect(provider)}
                  style={btnStyle('var(--ink)', 'var(--linen)')}>OAuth</button>
              )}
            </div>
          )}
        </div>

        {/* ── PAT inline form ── */}
        {!connected && isPatOpen && patUrl && (
          <div style={{
            marginTop: 10,
            background: 'rgba(184,134,78,.05)',
            border: '1px solid rgba(184,134,78,.18)',
            borderRadius: 12, padding: '14px',
          }}>
            <div style={{ fontSize: 11, color: 'var(--ash)', marginBottom: 10, lineHeight: 1.6 }}>
              Generate a free Personal Access Token at{' '}
              <a href={patUrl} target="_blank" rel="noopener noreferrer"
                style={{ color: 'var(--copper)', textDecoration: 'none', fontWeight: 600 }}>
                {patUrl.replace('https://', '')}
              </a>
              {' '}— no app approval needed.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="password"
                placeholder="Paste token here…"
                value={patToken}
                onChange={e => setPatToken(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handlePatSave(provider) }}
                style={{
                  flex: 1, background: 'var(--white)', border: '1px solid var(--ash3)',
                  borderRadius: 10, padding: '8px 12px', fontSize: 12,
                  color: 'var(--ink)', outline: 'none',
                }}
              />
              <button
                onClick={() => handlePatSave(provider)}
                disabled={patSaving || !patToken.trim()}
                style={btnStyle('var(--copper)', 'var(--linen)')}
              >
                {patSaving ? '…' : 'Save'}
              </button>
            </div>
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
            icon="⌚" name="WHOOP" color="rgba(58,122,92)" provider="whoop"
            configured={whoopStatus?.configured ?? false}
            connected={whoopStatus?.connected ?? false}
            lastSync={whoopStatus?.last_synced ?? null}
            patUrl="https://developer.whoop.com"
          />
          <WearableRow
            icon="💍" name="Oura Ring" color="rgba(46,95,138)" provider="oura"
            configured={ouraStatus?.configured ?? false}
            connected={ouraStatus?.connected ?? false}
            lastSync={ouraStatus?.last_synced ?? null}
            patUrl="https://cloud.ouraring.com/personal-access-tokens"
          />
          <WearableRow
            icon="📊" name="Fitbit" color="rgba(0,178,227)" provider="fitbit"
            configured={fitbitStatus?.configured ?? false}
            connected={fitbitStatus?.connected ?? false}
            lastSync={fitbitStatus?.last_synced ?? null}
            patUrl="https://dev.fitbit.com/apps"
            subtitle="Sleep · HRV · RHR"
          />
          <WearableRow
            icon="🚴" name="Strava" color="rgba(252,76,2)" provider="strava"
            configured={stravaStatus?.configured ?? false}
            connected={stravaStatus?.connected ?? false}
            lastSync={stravaStatus?.last_synced ?? null}
            hasPat={false}
            subtitle="Activities · Training load"
          />

          {/* Apple Health — iOS native only */}
          {isNative && (
            <div style={{ borderBottom: '1px solid var(--ash3)', paddingBottom: 14, marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: 10,
                    background: ahConnected ? 'rgba(252,37,107,.1)' : 'var(--ash3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
                  }}>❤️</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Apple Health</div>
                    <div style={{ fontSize: 11, color: ahConnected ? 'var(--green)' : 'var(--ash)' }}>
                      {ahConnected ? 'HRV · RHR · Sleep' : 'Tap to read from HealthKit'}
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleAppleHealthSync}
                  disabled={ahSyncing}
                  style={btnStyle('var(--ink)', 'var(--linen)')}
                >
                  {ahSyncing ? '…' : ahConnected ? '↻ Sync' : 'Connect ↗'}
                </button>
              </div>
            </div>
          )}

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

