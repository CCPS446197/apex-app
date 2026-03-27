import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import { fmtWeight } from '../../utils/units'
import splits, { SplitTemplate, getSplitById } from '../../data/splits'
import { getExerciseById, getAlternatives } from '../../data/exercises'
import { Exercise, WorkoutDay } from '../../types'

const DAY_KEYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
// JS getDay(): 0=Sun,1=Mon…6=Sat  →  split index: 0=Mon…6=Sun
function todaySplitIndex() {
  const d = new Date().getDay()
  return d === 0 ? 6 : d - 1
}

function splitExercisesToExercises(day: SplitTemplate['days'][number]): Exercise[] {
  return day.exercises.map(se => {
    const tpl = getExerciseById(se.exerciseId)
    return {
      id: se.exerciseId,
      name: tpl?.name ?? se.exerciseId,
      sets: se.sets,
      reps: se.reps,
      weight: se.weight,
      restSec: se.restSec,
      sets_logged: [],
    }
  })
}

function buildWorkoutPlan(split: SplitTemplate, prevPlan: WorkoutDay[]): WorkoutDay[] {
  const todayIdx = todaySplitIndex()
  return split.days.map((d, i) => {
    const prevDay = prevPlan[i]
    return {
      day: DAY_KEYS[i],
      name: d.name,
      muscle: d.muscle,
      type: d.type,
      done: prevDay?.done ?? false,
      isToday: i === todayIdx,
      exercises: splitExercisesToExercises(d),
    }
  })
}

interface Props {
  open: boolean
  onClose: () => void
  showToast: (msg: string) => void
}

type Tab = 'templates' | 'schedule'

export default function SplitModal({ open, onClose, showToast }: Props) {
  const { state, setState } = useApp()
  const { workoutPlan, activeSplitId, darkMode } = state
  const darkCard = darkMode ? '#0A0908' : '#1A1714'
  const darkCardText = '#F5F0E8'

  const [tab, setTab]                   = useState<Tab>('templates')
  const [expandedDay, setExpandedDay]   = useState<number | null>(null)
  const [swapTarget, setSwapTarget]     = useState<{ dayIdx: number; exIdx: number } | null>(null)
  const [scienceOpen, setScienceOpen]   = useState<string | null>(null)

  if (!open) return null

  // ── Apply a full split template ─────────────────────────────────────────
  function applySplit(splitId: string) {
    const split = getSplitById(splitId)
    if (!split) return
    const todayIdx = todaySplitIndex()
    const newPlan = buildWorkoutPlan(split, workoutPlan)
    const todayExercises = newPlan[todayIdx]?.exercises ?? []

    setState(prev => ({
      ...prev,
      activeSplitId: splitId,
      workoutPlan: newPlan,
      todayExercises,
    }))
    showToast(`${split.name} applied ✓`)
    setTab('schedule')
  }

  // ── Swap a single exercise within a day ────────────────────────────────
  function swapExercise(dayIdx: number, exIdx: number, newExId: string) {
    const tpl = getExerciseById(newExId)
    if (!tpl) return
    const se = getSplitById(activeSplitId)?.days[dayIdx]?.exercises[exIdx]
    const newEx: Exercise = {
      id: tpl.id,
      name: tpl.name,
      sets: se?.sets ?? tpl.defaultSets,
      reps: se?.reps ?? tpl.defaultReps,
      weight: se?.weight ?? tpl.defaultWeight,
      restSec: se?.restSec ?? tpl.defaultRestSec,
      sets_logged: [],
    }
    setState(prev => {
      const newPlan = prev.workoutPlan.map((day, di) => {
        if (di !== dayIdx) return day
        const exs = [...(day.exercises ?? [])]
        exs[exIdx] = newEx
        return { ...day, exercises: exs }
      })
      const todayIdx = todaySplitIndex()
      const newToday = dayIdx === todayIdx
        ? (newPlan[todayIdx]?.exercises ?? prev.todayExercises)
        : prev.todayExercises
      return { ...prev, workoutPlan: newPlan, todayExercises: newToday }
    })
    setSwapTarget(null)
    showToast(`Swapped to ${tpl.name}`)
  }

  const activeSplit = getSplitById(activeSplitId)

  // ── TEMPLATE CARDS ─────────────────────────────────────────────────────
  function renderTemplates() {
    return (
      <div style={{ padding: '0 20px 32px' }}>
        {splits.map(split => {
          const isActive = split.id === activeSplitId
          const isSciOpen = scienceOpen === split.id
          const goalColor = split.goal === 'hypertrophy' ? 'var(--copper)' : split.goal === 'strength' ? 'var(--blue)' : 'var(--green)'
          return (
            <div
              key={split.id}
              style={{
                borderRadius: 16,
                border: `1.5px solid ${isActive ? darkCard : 'var(--ash3)'}`,
                background: isActive ? darkCard : 'var(--white)',
                marginBottom: 14,
                overflow: 'hidden',
              }}
            >
              <div style={{ padding: '16px 16px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                  <div>
                    <div style={{
                      fontFamily: "'Cormorant Garamond', serif",
                      fontSize: 20,
                      fontWeight: 600,
                      color: isActive ? darkCardText : 'var(--ink)',
                      lineHeight: 1.2,
                    }}>
                      {split.name}
                    </div>
                    <div style={{ fontSize: 11, color: isActive ? 'rgba(245,240,232,.5)' : 'var(--ash)', marginTop: 2 }}>
                      {split.split}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, letterSpacing: .5,
                      padding: '3px 8px', borderRadius: 20,
                      background: isActive ? 'rgba(245,240,232,.12)' : 'var(--linen2)',
                      color: isActive ? darkCardText : 'var(--ash)',
                    }}>
                      {split.frequency}
                    </span>
                    <span style={{
                      fontSize: 10, fontWeight: 700, letterSpacing: .5,
                      padding: '3px 8px', borderRadius: 20,
                      background: isActive ? 'rgba(245,240,232,.12)' : 'rgba(0,0,0,.04)',
                      color: isActive ? 'var(--copper)' : goalColor,
                    }}>
                      {split.goal}
                    </span>
                  </div>
                </div>

                <div style={{
                  fontSize: 13, color: isActive ? 'rgba(245,240,232,.7)' : 'var(--ink)',
                  marginTop: 10, lineHeight: 1.5,
                }}>
                  {split.description}
                </div>

                {/* Science toggle */}
                <button
                  onClick={() => setScienceOpen(isSciOpen ? null : split.id)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 5, marginTop: 8,
                    padding: 0,
                    fontSize: 11, fontWeight: 600, letterSpacing: .5,
                    color: isActive ? 'var(--copper)' : 'var(--copper)',
                  }}
                >
                  <span>✦</span>
                  <span>SCIENCE {isSciOpen ? '▲' : '▼'}</span>
                </button>

                {isSciOpen && (
                  <div style={{
                    marginTop: 10, padding: 12, borderRadius: 10,
                    background: isActive ? 'rgba(245,240,232,.06)' : 'var(--linen2)',
                    borderLeft: '3px solid var(--copper)',
                  }}>
                    <div style={{ fontSize: 12, color: isActive ? 'rgba(245,240,232,.75)' : 'var(--ink)', lineHeight: 1.55 }}>
                      {split.scienceNote}
                    </div>
                    <div style={{ fontSize: 10, color: isActive ? 'rgba(245,240,232,.4)' : 'var(--ash)', marginTop: 6, fontStyle: 'italic' }}>
                      {split.citation}
                    </div>
                  </div>
                )}
              </div>

              {/* Day structure pills */}
              <div style={{
                padding: '8px 16px 12px',
                display: 'flex', flexWrap: 'wrap', gap: 5,
                borderTop: `1px solid ${isActive ? 'rgba(245,240,232,.08)' : 'var(--ash3)'}`,
              }}>
                {split.days.map((d, i) => (
                  <span key={i} style={{
                    fontSize: 10, fontWeight: 700, padding: '3px 8px',
                    borderRadius: 20, letterSpacing: .4,
                    background: d.type === 'rest'
                      ? (isActive ? 'rgba(245,240,232,.06)' : 'var(--ash3)')
                      : (isActive ? 'rgba(245,240,232,.12)' : 'var(--linen2)'),
                    color: d.type === 'rest'
                      ? (isActive ? 'rgba(245,240,232,.3)' : 'var(--ash)')
                      : (isActive ? darkCardText : 'var(--ink)'),
                  }}>
                    {d.name.split(' ')[0]}
                  </span>
                ))}
              </div>

              <div style={{ padding: '0 16px 16px' }}>
                {isActive ? (
                  <div style={{
                    textAlign: 'center', fontSize: 12, fontWeight: 600,
                    color: 'rgba(245,240,232,.5)', letterSpacing: .5,
                    padding: '10px 0',
                  }}>
                    ✓ ACTIVE SPLIT
                  </div>
                ) : (
                  <button
                    onClick={() => applySplit(split.id)}
                    style={{
                      width: '100%', padding: '11px 0',
                      borderRadius: 10, border: 'none', cursor: 'pointer',
                      background: darkCard, color: darkCardText,
                      fontSize: 13, fontWeight: 600, letterSpacing: .5,
                    }}
                  >
                    Apply Split
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // ── SCHEDULE / PER-DAY EDITOR ──────────────────────────────────────────
  function renderSchedule() {
    if (!activeSplitId) {
      return (
        <div style={{ padding: '60px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>✦</div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, color: 'var(--ink)', marginBottom: 8 }}>
            No split applied yet
          </div>
          <div style={{ fontSize: 13, color: 'var(--ash)', lineHeight: 1.5 }}>
            Choose a template from the Templates tab to build your week.
          </div>
          <button
            onClick={() => setTab('templates')}
            style={{
              marginTop: 20, padding: '11px 28px', borderRadius: 24,
              border: 'none', cursor: 'pointer',
              background: 'var(--ink)', color: 'var(--linen)',
              fontSize: 13, fontWeight: 600, letterSpacing: .5,
            }}
          >
            Browse Templates
          </button>
        </div>
      )
    }

    const todayIdx = todaySplitIndex()

    return (
      <div style={{ padding: '0 20px 32px' }}>
        {activeSplit && (
          <div style={{
            marginBottom: 16, padding: '10px 14px', borderRadius: 10,
            background: 'var(--linen2)',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--copper)', letterSpacing: .5 }}>ACTIVE</span>
            <span style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 600 }}>{activeSplit.name}</span>
            <span style={{ fontSize: 11, color: 'var(--ash)', marginLeft: 'auto' }}>{activeSplit.frequency}</span>
          </div>
        )}

        {workoutPlan.map((day, dayIdx) => {
          const isToday = dayIdx === todayIdx
          const isExpanded = expandedDay === dayIdx
          const exCount = day.exercises?.length ?? 0

          return (
            <div key={day.day} style={{
              borderRadius: 14,
              border: `1.5px solid ${isToday ? darkCard : 'var(--ash3)'}`,
              background: isToday ? darkCard : 'var(--white)',
              marginBottom: 10,
              overflow: 'hidden',
            }}>
              <button
                onClick={() => {
                  setExpandedDay(isExpanded ? null : dayIdx)
                  setSwapTarget(null)
                }}
                style={{
                  width: '100%', background: 'none', border: 'none',
                  cursor: 'pointer', padding: '14px 16px',
                  display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left',
                }}
              >
                <div style={{
                  width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: isToday ? 'rgba(245,240,232,.12)' : 'var(--linen2)',
                  fontSize: 10, fontWeight: 700, letterSpacing: .5,
                  color: isToday ? darkCardText : 'var(--ash)',
                }}>
                  {day.day}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: 14, fontWeight: 600,
                    color: isToday ? darkCardText : 'var(--ink)',
                  }}>
                    {day.name}
                    {isToday && (
                      <span style={{ marginLeft: 7, fontSize: 10, color: 'var(--copper)', fontWeight: 700, letterSpacing: .5 }}>
                        TODAY
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: isToday ? 'rgba(245,240,232,.5)' : 'var(--ash)', marginTop: 1 }}>
                    {day.type === 'rest' ? 'Recovery day' : `${exCount} exercises · ${day.muscle}`}
                  </div>
                </div>
                <span style={{ color: isToday ? 'rgba(245,240,232,.3)' : 'var(--ash2)', fontSize: 12 }}>
                  {isExpanded ? '▲' : '▼'}
                </span>
              </button>

              {isExpanded && day.type !== 'rest' && (
                <div style={{
                  borderTop: `1px solid ${isToday ? 'rgba(245,240,232,.1)' : 'var(--ash3)'}`,
                  padding: '12px 16px 16px',
                }}>
                  {(day.exercises ?? []).map((ex, exIdx) => {
                    const isSwapping = swapTarget?.dayIdx === dayIdx && swapTarget?.exIdx === exIdx
                    const tpl = getExerciseById(ex.id)
                    const alts = tpl ? getAlternatives(ex.id) : []

                    return (
                      <div key={`${ex.id}-${exIdx}`}>
                        <div style={{
                          display: 'flex', alignItems: 'center',
                          padding: '9px 0',
                          borderBottom: `1px solid ${isToday ? 'rgba(245,240,232,.08)' : 'var(--linen2)'}`,
                          gap: 10,
                        }}>
                          <div style={{ flex: 1 }}>
                            <div style={{
                              fontSize: 13, fontWeight: 600,
                              color: isToday ? darkCardText : 'var(--ink)',
                            }}>
                              {ex.name}
                            </div>
                            <div style={{
                              fontSize: 11, marginTop: 2,
                              color: isToday ? 'rgba(245,240,232,.45)' : 'var(--ash)',
                            }}>
                              {ex.sets}×{ex.reps} · {ex.restSec}s rest · {ex.weight > 0 ? fmtWeight(ex.weight, state.weightUnit) : 'BW'}
                            </div>
                            {tpl?.tip && !isSwapping && (
                              <div style={{
                                fontSize: 10, marginTop: 3, fontStyle: 'italic',
                                color: isToday ? 'rgba(245,240,232,.3)' : 'var(--ash2)',
                                lineHeight: 1.4,
                              }}>
                                {tpl.tip.split('.')[0]}.
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => setSwapTarget(isSwapping ? null : { dayIdx, exIdx })}
                            style={{
                              flexShrink: 0, padding: '6px 11px',
                              borderRadius: 8, cursor: 'pointer',
                              border: `1px solid ${isToday ? 'rgba(245,240,232,.2)' : 'var(--ash3)'}`,
                              background: isSwapping ? 'var(--copper)' : 'transparent',
                              fontSize: 11, fontWeight: 600, letterSpacing: .4,
                              color: isSwapping ? 'white' : (isToday ? 'rgba(245,240,232,.6)' : 'var(--ash)'),
                            }}
                          >
                            {isSwapping ? 'Cancel' : 'Swap'}
                          </button>
                        </div>

                        {/* Exercise alternatives */}
                        {isSwapping && (
                          <div style={{
                            margin: '8px 0 4px',
                            padding: 12, borderRadius: 10,
                            background: isToday ? 'rgba(245,240,232,.05)' : 'var(--linen2)',
                          }}>
                            <div style={{
                              fontSize: 10, fontWeight: 700, letterSpacing: .8,
                              color: isToday ? 'rgba(245,240,232,.4)' : 'var(--ash)',
                              marginBottom: 8,
                            }}>
                              SWAP WITH
                            </div>
                            {alts.length === 0 ? (
                              <div style={{ fontSize: 12, color: 'var(--ash)', fontStyle: 'italic' }}>
                                No alternatives found for this muscle group.
                              </div>
                            ) : (
                              alts.map(alt => (
                                <button
                                  key={alt.id}
                                  onClick={() => swapExercise(dayIdx, exIdx, alt.id)}
                                  style={{
                                    width: '100%', background: 'none',
                                    border: `1px solid ${isToday ? 'rgba(245,240,232,.12)' : 'var(--ash3)'}`,
                                    borderRadius: 8, cursor: 'pointer',
                                    padding: '9px 12px', marginBottom: 6,
                                    display: 'flex', alignItems: 'center', gap: 10,
                                    textAlign: 'left',
                                  }}
                                >
                                  <div style={{ flex: 1 }}>
                                    <div style={{
                                      fontSize: 13, fontWeight: 600,
                                      color: isToday ? darkCardText : 'var(--ink)',
                                    }}>
                                      {alt.name}
                                    </div>
                                    <div style={{
                                      fontSize: 11,
                                      color: isToday ? 'rgba(245,240,232,.4)' : 'var(--ash)',
                                      marginTop: 1,
                                    }}>
                                      {alt.defaultSets}×{alt.defaultReps} · {alt.mechanic} · {alt.equipment}
                                    </div>
                                  </div>
                                  <span style={{
                                    fontSize: 11, fontWeight: 700,
                                    padding: '2px 7px', borderRadius: 6,
                                    background: isToday ? 'rgba(245,240,232,.1)' : 'var(--ash3)',
                                    color: isToday ? 'rgba(245,240,232,.5)' : 'var(--ash)',
                                  }}>
                                    {alt.muscles[0]}
                                  </span>
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {isExpanded && day.type === 'rest' && (
                <div style={{
                  borderTop: `1px solid ${isToday ? 'rgba(245,240,232,.1)' : 'var(--ash3)'}`,
                  padding: '16px',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: 13, color: isToday ? 'rgba(245,240,232,.5)' : 'var(--ash)', fontStyle: 'italic' }}>
                    Dedicated recovery — light walking, mobility, or full rest.
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,.5)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        width: '100%', maxWidth: 430,
        background: 'var(--linen)',
        borderRadius: '24px 24px 0 0',
        maxHeight: '92vh',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Handle + header */}
        <div style={{ padding: '12px 20px 0', flexShrink: 0 }}>
          <div style={{
            width: 36, height: 4, borderRadius: 2,
            background: 'var(--ash3)', margin: '0 auto 16px',
          }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 24, fontWeight: 600, color: 'var(--ink)',
            }}>
              Training Split
            </div>
            <button
              onClick={onClose}
              style={{
                width: 32, height: 32, borderRadius: '50%',
                border: 'none', cursor: 'pointer',
                background: 'var(--ash3)', color: 'var(--ink)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, fontWeight: 300,
              }}
            >
              ×
            </button>
          </div>

          {/* Tabs */}
          <div style={{
            display: 'flex', gap: 6, marginBottom: 16,
            background: 'var(--ash3)', borderRadius: 12, padding: 4,
          }}>
            {(['templates', 'schedule'] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  flex: 1, padding: '8px 0',
                  borderRadius: 9, border: 'none', cursor: 'pointer',
                  background: tab === t ? 'var(--white)' : 'transparent',
                  boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,.08)' : 'none',
                  fontSize: 13, fontWeight: 600,
                  color: tab === t ? 'var(--ink)' : 'var(--ash)',
                  transition: 'all .15s ease',
                  letterSpacing: .3,
                }}
              >
                {t === 'templates' ? 'Templates' : 'My Split'}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable content */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {tab === 'templates' ? renderTemplates() : renderSchedule()}
        </div>
      </div>
    </div>
  )
}
