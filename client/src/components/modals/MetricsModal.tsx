import { useState, useMemo } from 'react'
import { useApp } from '../../context/AppContext'
import type { MetricEntry } from '../../types'
import { kgToLbs, lbsToKg, fmtWeightVal } from '../../utils/units'

interface Props {
  open: boolean
  onClose: () => void
  showToast: (msg: string) => void
}

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10)
}

function computeScore(hrv: number, sleep: number, rhr: number): number {
  const hrvScore   = Math.min(hrv / 100 * 50, 50)
  const sleepScore = sleep >= 8 ? 30 : sleep >= 7 ? 26 : sleep >= 6 ? 18 : 10
  const rhrScore   = rhr <= 45 ? 20 : rhr <= 55 ? 16 : rhr <= 62 ? 10 : 4
  return Math.round(Math.min(hrvScore + sleepScore + rhrScore, 100))
}

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export default function MetricsModal({ open, onClose, showToast }: Props) {
  const { state, setState } = useApp()
  const { recovery, profile, metricHistory } = state
  const weightUnit = state.weightUnit

  const todayStr = toDateStr(new Date())

  // Pre-populate with today's existing entry if available, else current state
  const todayEntry = metricHistory.find(e => e.date === todayStr)
  const [hrv,    setHrv]    = useState(String(todayEntry?.hrv    ?? recovery.hrv))
  const [sleep,  setSleep]  = useState(String(todayEntry?.sleep  ?? recovery.sleep))
  const [rhr,    setRhr]    = useState(String(todayEntry?.rhr    ?? recovery.rhr))
  const [weight, setWeight] = useState(fmtWeightVal(todayEntry?.weight ?? profile.weight, weightUnit))

  const previewScore = computeScore(
    parseFloat(hrv)    || recovery.hrv,
    parseFloat(sleep)  || recovery.sleep,
    parseFloat(rhr)    || recovery.rhr,
  )

  // Build last 7 calendar days with log status
  const last7 = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (6 - i))
      const ds = toDateStr(d)
      const entry = metricHistory.find(e => e.date === ds)
      return { date: ds, day: DAY_LABELS[d.getDay()], entry, isToday: ds === todayStr }
    })
  }, [metricHistory, todayStr])

  function save() {
    const newHrv    = parseFloat(hrv)    || recovery.hrv
    const newSleep  = parseFloat(sleep)  || recovery.sleep
    const newRhr    = parseFloat(rhr)    || recovery.rhr
    const rawWeight = parseFloat(weight) || (weightUnit === 'lbs' ? kgToLbs(profile.weight) : profile.weight)
    const newWeight = weightUnit === 'lbs' ? lbsToKg(rawWeight) : rawWeight
    const newScore  = computeScore(newHrv, newSleep, newRhr)

    const entry: MetricEntry = {
      date: todayStr, hrv: newHrv, sleep: newSleep,
      rhr: newRhr, weight: newWeight, score: newScore,
    }

    setState(prev => {
      // Update or append today's entry
      const filtered = prev.metricHistory.filter(e => e.date !== todayStr)
      const newHistory = [...filtered, entry].sort((a, b) => a.date.localeCompare(b.date))

      // Rebuild HRV chart from last 7 days of history
      const recent7 = Array.from({ length: 7 }, (_, i) => {
        const d = new Date()
        d.setDate(d.getDate() - (6 - i))
        const ds = toDateStr(d)
        const e  = ds === todayStr ? entry : newHistory.find(x => x.date === ds)
        return e ? e.hrv : 0
      })

      const hasRealHistory = recent7.some(v => v > 0)
      const newHrvHistory  = hasRealHistory ? recent7 : prev.recovery.hrvHistory

      return {
        ...prev,
        profile: { ...prev.profile, weight: newWeight },
        recovery: {
          ...prev.recovery,
          hrv:        newHrv,
          sleep:      newSleep,
          rhr:        newRhr,
          score:      newScore,
          hrvHistory: newHrvHistory,
        },
        metricHistory: newHistory,
      }
    })

    showToast('Metrics logged ✓')
    onClose()
  }

  const scoreColor = previewScore >= 85 ? 'var(--green)'
    : previewScore >= 70 ? 'var(--copper)'
    : previewScore >= 55 ? '#B87A3A' : 'var(--red)'

  return (
    <div className={`modal-overlay${open ? ' open' : ''}`} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-sheet">
        <div className="modal-handle" />
        <div className="modal-header">
          <div className="modal-title">Morning Check-In</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {/* 7-day log history strip */}
        <div style={{ padding: '0 20px 16px' }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {last7.map(d => (
              <div key={d.date} style={{
                flex: 1, textAlign: 'center',
                background: d.entry
                  ? d.isToday ? 'var(--ink)' : 'rgba(58,122,92,.1)'
                  : d.isToday ? 'rgba(184,134,78,.08)' : 'var(--linen2)',
                border: `1px solid ${d.isToday
                  ? d.entry ? 'var(--ink)' : 'rgba(184,134,78,.4)'
                  : d.entry ? 'rgba(58,122,92,.3)' : 'var(--ash3)'}`,
                borderRadius: 10,
                padding: '7px 4px',
              }}>
                <div style={{
                  fontSize: 9, fontWeight: 600, letterSpacing: .5,
                  color: d.isToday && !d.entry ? 'var(--copper)' : d.isToday ? 'rgba(245,240,232,.5)' : 'var(--ash2)',
                  marginBottom: 3,
                }}>{d.day}</div>
                <div style={{ fontSize: 13 }}>
                  {d.entry ? (d.isToday ? '●' : '✓') : d.isToday ? '○' : '–'}
                </div>
                {d.entry && (
                  <div style={{
                    fontSize: 9, marginTop: 2,
                    color: d.isToday ? 'rgba(245,240,232,.6)' : 'var(--green)',
                    fontWeight: 600,
                  }}>
                    {d.entry.hrv}ms
                  </div>
                )}
              </div>
            ))}
          </div>
          {!last7[6].entry && (
            <div style={{ fontSize: 11, color: 'var(--copper)', marginTop: 8, textAlign: 'center' }}>
              Today's metrics not yet logged
            </div>
          )}
        </div>

        {/* Live readiness preview */}
        <div style={{
          margin: '0 20px 16px',
          background: 'var(--ink)',
          borderRadius: 16,
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: 2, color: 'rgba(245,240,232,.4)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>
              Readiness Preview
            </div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 14, fontWeight: 300, color: 'rgba(245,240,232,.7)', fontStyle: 'italic' }}>
              {previewScore >= 85 ? 'Optimal — train at full capacity'
                : previewScore >= 70 ? 'Good — train as planned'
                : previewScore >= 55 ? 'Fair — reduce load 15–20%'
                : 'Poor — active recovery only'}
            </div>
          </div>
          <div style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 52, fontWeight: 300,
            color: scoreColor, lineHeight: 1,
          }}>
            {previewScore}
          </div>
        </div>

        <div className="modal-body">
          {[
            {
              label: 'HRV (ms)', sub: 'Morning resting — check your wearable or app',
              val: hrv, set: setHrv,
              hint: (v: string) => {
                const n = parseFloat(v); if (!n) return null
                return n >= 70 ? '↑ Excellent' : n >= 55 ? '→ Good' : n >= 40 ? '↓ Fair' : '↓ Low'
              },
              color: (v: string) => {
                const n = parseFloat(v); if (!n) return 'var(--ash)'
                return n >= 70 ? 'var(--green)' : n >= 55 ? 'var(--copper)' : n >= 40 ? '#B87A3A' : 'var(--red)'
              },
            },
            {
              label: 'Sleep (hours)', sub: 'Total time asleep — not time in bed',
              val: sleep, set: setSleep,
              hint: (v: string) => {
                const n = parseFloat(v); if (!n) return null
                return n >= 8 ? '↑ Excellent' : n >= 7 ? '→ Good' : n >= 6 ? '↓ Fair' : '↓ Poor'
              },
              color: (v: string) => {
                const n = parseFloat(v); if (!n) return 'var(--ash)'
                return n >= 8 ? 'var(--green)' : n >= 7 ? 'var(--copper)' : n >= 6 ? '#B87A3A' : 'var(--red)'
              },
            },
            {
              label: 'Resting HR (bpm)', sub: 'First reading of the day, lying down',
              val: rhr, set: setRhr,
              hint: (v: string) => {
                const n = parseFloat(v); if (!n) return null
                return n <= 48 ? '↑ Excellent' : n <= 55 ? '→ Good' : n <= 62 ? '↓ Fair' : '↓ Elevated'
              },
              color: (v: string) => {
                const n = parseFloat(v); if (!n) return 'var(--ash)'
                return n <= 48 ? 'var(--green)' : n <= 55 ? 'var(--copper)' : n <= 62 ? '#B87A3A' : 'var(--red)'
              },
            },
            {
              label: `Weight (${weightUnit})`, sub: 'Morning fasted weight',
              val: weight, set: setWeight,
              hint: () => null, color: () => 'var(--ash)',
            },
          ].map(f => {
            const hint = f.hint(f.val)
            return (
              <div key={f.label} className="inp-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                  <div className="inp-label">{f.label}</div>
                  {hint && <div style={{ fontSize: 11, fontWeight: 600, color: f.color(f.val) }}>{hint}</div>}
                </div>
                <input
                  className="inp"
                  type="number"
                  inputMode="decimal"
                  value={f.val}
                  onChange={e => f.set(e.target.value)}
                  placeholder="—"
                />
                <div style={{ fontSize: 11, color: 'var(--ash)', marginTop: 4 }}>{f.sub}</div>
              </div>
            )
          })}

          <button className="btn-primary" style={{ marginTop: 8, marginBottom: 12 }} onClick={save}>
            Log Today's Metrics
          </button>
        </div>
      </div>
    </div>
  )
}
