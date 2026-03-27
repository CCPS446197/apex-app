import { useState, useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { fmtWeight } from '../utils/units'
import { useTimer } from '../hooks/useTimer'
import { Page } from '../types'

interface Props {
  onNav: (p: Page) => void
  showToast: (msg: string) => void
  onEditSplit: () => void
}

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

type SetInputs = Record<string, { weight: string; reps: string }[]>

export default function Train({ onNav, showToast, onEditSplit }: Props) {
  const { state, setState } = useApp()
  const { weeklyVolume, todayExercises, workoutPlan } = state
  const weightUnit = state.weightUnit
  const timer = useTimer(90)
  const [expanded, setExpanded] = useState<string | null>(null)

  function toDisplay(kg: number) {
    if (weightUnit === 'lbs') return String(Math.round(kg * 2.20462 * 10) / 10)
    return String(kg)
  }

  // Initialize all set inputs at mount time (clean, no anti-pattern)
  const [setInputs, setSetInputs] = useState<SetInputs>(() => {
    const init: SetInputs = {}
    for (const ex of todayExercises) {
      init[ex.id] = Array.from({ length: ex.sets }, (_, i) => {
        const logged = ex.sets_logged[i]
        const kgVal = logged ? logged.weight : ex.weight
        return {
          weight: toDisplay(kgVal),
          reps: logged ? String(logged.reps) : ex.reps.split('–')[0],
        }
      })
    }
    return init
  })

  const todayPlan = workoutPlan.find(w => w.isToday) || workoutPlan[1]
  const maxVol = Math.max(...weeklyVolume, 1)
  const totalVol = weeklyVolume.reduce((s, v) => s + v, 0)
  const todayDayIdx = new Date().getDay()

  function toggleExpand(id: string) {
    setExpanded(p => p === id ? null : id)
  }

  function updateInput(exId: string, setIdx: number, field: 'weight' | 'reps', value: string) {
    setSetInputs(p => {
      const arr = [...(p[exId] || [])]
      arr[setIdx] = { ...arr[setIdx], [field]: value }
      return { ...p, [exId]: arr }
    })
  }

  function logSet(exId: string, setIdx: number) {
    const ex = todayExercises.find(e => e.id === exId)
    if (!ex) return
    const inp = (setInputs[exId] || [])[setIdx]
    const rawInput = parseFloat(inp?.weight) || ex.weight
    const weightKg = weightUnit === 'lbs' ? rawInput / 2.20462 : rawInput
    const reps = parseInt(inp?.reps) || parseInt(ex.reps)

    setState(prev => ({
      ...prev,
      todayExercises: prev.todayExercises.map(e => {
        if (e.id !== exId) return e
        const newLogs = [...e.sets_logged]
        newLogs[setIdx] = { weight: weightKg, reps, notes: '' }
        return { ...e, sets_logged: newLogs }
      }),
    }))
    showToast(`Set ${setIdx + 1} logged — ${rawInput}${weightUnit} × ${reps}`)
    timer.startWith(ex.restSec)
  }

  function finishSession() {
    const vol = todayExercises.reduce((s, ex) =>
      s + ex.sets_logged.reduce((ss, sl) => ss + sl.weight * sl.reps, 0), 0)
    setState(prev => {
      const vols = [...prev.weeklyVolume]
      vols[todayDayIdx] = Math.round(vol)
      return { ...prev, weeklyVolume: vols }
    })
    showToast('Session complete! 🎯')
  }

  const sessionDone = todayExercises.every(e => e.sets_logged.length >= e.sets)
  const sessionStarted = todayExercises.some(e => e.sets_logged.length > 0)

  return (
    <div className="page active">
      <div className="train-header">
        <div className="eyebrow">
          {DAYS[todayDayIdx]} · {todayPlan?.name}
        </div>
        <div className="train-title">
          Your session,<br /><em>adapted for today.</em>
        </div>
      </div>

      <div className="ai-adapt-banner" onClick={() => onNav('ai')}>
        <div className="aab-icon">✦</div>
        <div className="aab-text">
          <div className="aab-title">AI adjusted your load</div>
          <div className="aab-sub">
            Readiness {state.recovery.score}/100 · Volume optimised for current HRV
          </div>
        </div>
        <div style={{ color: 'rgba(245,240,232,.3)', fontSize: 18 }}>›</div>
      </div>

      <div className="timer-card">
        <div className={`timer-num${timer.state === 'running' ? ' running' : timer.state === 'done' ? ' done' : ''}`}>
          {timer.displayText}
        </div>
        <div className="timer-lbl">REST TIMER</div>
        <div className="timer-btns">
          <button className="timer-btn" onClick={() => timer.setDuration(60)}>60s</button>
          <button className="timer-btn" onClick={() => timer.setDuration(90)}>90s</button>
          <button className="timer-btn primary" onClick={timer.toggle}>
            {timer.state === 'running' ? 'Pause' : timer.state === 'done' ? 'Reset' : 'Start'}
          </button>
          <button className="timer-btn" onClick={() => timer.setDuration(120)}>2m</button>
          <button className="timer-btn" onClick={() => timer.setDuration(180)}>3m</button>
        </div>
      </div>

      <div className="volume-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div className="eyebrow" style={{ margin: 0 }}>Weekly Volume</div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 300 }}>
            {(totalVol / 1000).toFixed(1)}k kg
          </div>
        </div>
        <div className="bar-chart">
          {weeklyVolume.map((v, i) => (
            <div
              key={i}
              className={`bbar${i === todayDayIdx ? ' today' : ''}`}
              style={{
                height: maxVol > 0 ? `${Math.max((v / maxVol) * 100, 4)}%` : '4px',
                background: i === todayDayIdx
                  ? 'var(--copper)'
                  : v > 0 ? 'var(--ink)' : 'var(--ash3)',
              }}
            />
          ))}
        </div>
        <div className="bar-labels">
          {DAYS.map((d, i) => (
            <div key={d} className="blabel" style={{ color: i === todayDayIdx ? 'var(--copper)' : undefined, fontWeight: i === todayDayIdx ? 600 : undefined }}>
              {d[0]}
            </div>
          ))}
        </div>
      </div>

      {/* Week Plan Strip */}
      <div style={{ padding: '0 24px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div className="eyebrow" style={{ margin: 0 }}>This week</div>
          <button
            onClick={onEditSplit}
            style={{
              background: 'var(--ink)', border: 'none', cursor: 'pointer',
              color: 'var(--linen)', fontSize: 11, fontWeight: 700,
              letterSpacing: .6, padding: '5px 12px', borderRadius: 20,
              display: 'flex', alignItems: 'center', gap: 5,
            }}
          >
            <span style={{ fontSize: 12 }}>✦</span> Edit Split
          </button>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {workoutPlan.map((day, i) => {
            const isToday = day.isToday
            const isDone = day.done
            return (
              <div
                key={day.day}
                style={{
                  flex: 1,
                  borderRadius: 12,
                  padding: '8px 4px',
                  textAlign: 'center',
                  background: isToday ? 'var(--ink)' : isDone ? 'rgba(58,122,92,.1)' : 'var(--white)',
                  border: `1px solid ${isToday ? 'var(--ink)' : isDone ? 'rgba(58,122,92,.3)' : 'var(--ash3)'}`,
                }}
              >
                <div style={{
                  fontSize: 9,
                  letterSpacing: 1,
                  fontWeight: 600,
                  color: isToday ? 'rgba(245,240,232,.5)' : 'var(--ash)',
                  marginBottom: 4,
                }}>
                  {day.day}
                </div>
                <div style={{ fontSize: 16 }}>
                  {isDone ? '✓' : day.type === 'rest' ? '—' : isToday ? '●' : '○'}
                </div>
                <div style={{
                  fontSize: 9,
                  fontWeight: 600,
                  color: isToday ? 'var(--linen)' : isDone ? 'var(--green)' : 'var(--ash)',
                  marginTop: 3,
                  letterSpacing: .3,
                }}>
                  {day.name.split(' ')[0]}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div style={{ padding: '0 24px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div className="eyebrow" style={{ margin: 0 }}>Session log</div>
          {sessionStarted && !sessionDone && (
            <span className="pill pill-copper">
              {todayExercises.filter(e => e.sets_logged.length >= e.sets).length}/{todayExercises.length} done
            </span>
          )}
        </div>

        {todayExercises.map(ex => {
          const loggedCount = todayExercises.find(e => e.id === ex.id)?.sets_logged.length || 0
          const inputs = setInputs[ex.id] || []
          const isExpanded = expanded === ex.id
          const isComplete = loggedCount >= ex.sets

          return (
            <div key={ex.id} className="session-exercise">
              <div
                className="se-header"
                onClick={() => toggleExpand(ex.id)}
                style={{ background: isComplete ? 'rgba(58,122,92,.04)' : undefined }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {isComplete && (
                    <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg width="10" height="7" viewBox="0 0 10 7" fill="none">
                        <path d="M1 3.5L3.5 6L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  )}
                  <div className="se-name" style={{ color: isComplete ? 'var(--ash)' : undefined, textDecoration: isComplete ? 'line-through' : undefined }}>
                    {ex.name}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="se-progress" style={{ color: isComplete ? 'var(--green)' : undefined }}>
                    {loggedCount}/{ex.sets}
                  </span>
                  <span style={{ color: 'var(--ash)', fontSize: 12 }}>{isExpanded ? '▲' : '▼'}</span>
                </div>
              </div>

              {isExpanded && (
                <div className="se-sets">
                  <div style={{ padding: '6px 0 10px', borderBottom: '1px solid var(--linen2)', marginBottom: 6 }}>
                    <span style={{ fontSize: 11, color: 'var(--ash)', fontWeight: 600 }}>
                      {ex.sets}×{ex.reps} · Rest {ex.restSec}s · Last: {fmtWeight(ex.weight, weightUnit)}
                    </span>
                  </div>
                  {Array.from({ length: ex.sets }, (_, i) => {
                    const isLogged = !!ex.sets_logged[i]
                    const inp = inputs[i] || { weight: toDisplay(ex.weight), reps: ex.reps.split('–')[0] }
                    return (
                      <div key={i} className="set-row">
                        <span className="set-num">Set {i + 1}</span>
                        <div style={{ textAlign: 'center' }}>
                          <input
                            className="set-inp"
                            value={inp.weight}
                            onChange={e => updateInput(ex.id, i, 'weight', e.target.value)}
                            type="number"
                            inputMode="decimal"
                            disabled={isLogged}
                          />
                          <div className="set-inp-label">{weightUnit}</div>
                        </div>
                        <span className="set-x">×</span>
                        <div style={{ textAlign: 'center' }}>
                          <input
                            className="set-inp"
                            value={inp.reps}
                            onChange={e => updateInput(ex.id, i, 'reps', e.target.value)}
                            type="number"
                            inputMode="numeric"
                            disabled={isLogged}
                          />
                          <div className="set-inp-label">reps</div>
                        </div>
                        <button
                          className={`set-done-btn${isLogged ? ' logged' : ''}`}
                          onClick={() => !isLogged && logSet(ex.id, i)}
                          style={{ cursor: isLogged ? 'default' : 'pointer' }}
                        >
                          {isLogged && (
                            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                              <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}

        {sessionDone ? (
          <button className="btn-primary" style={{ marginTop: 12 }} onClick={finishSession}>
            Complete Session ✓
          </button>
        ) : sessionStarted && (
          <div style={{ marginTop: 10, padding: '10px 0', textAlign: 'center', fontSize: 12, color: 'var(--ash)' }}>
            Keep going · {todayExercises.reduce((s, e) => s + Math.max(0, e.sets - e.sets_logged.length), 0)} sets remaining
          </div>
        )}
      </div>
      <div className="bottom-spacer" />
    </div>
  )
}
