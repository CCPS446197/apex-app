import { useState, useRef, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import { fmtWeight } from '../utils/units'
import type { Exercise, WorkoutType } from '../types'

// ── Types ─────────────────────────────────────────────────────────────────────
interface ExerciseAction {
  type: 'add_exercise' | 'replace_exercise'
  dayIndex: number
  dayName: string
  replacesName?: string
  exercise: {
    id: string
    name: string
    sets: number
    reps: string
    weight: number
    restSec: number
  }
  reason: string
}

interface SplitDay {
  dayIndex: number
  dayName: string
  muscle: string
  workoutType: WorkoutType
  exercises: {
    id: string
    name: string
    sets: number
    reps: string
    weight: number
    restSec: number
  }[]
}

interface CreateSplitAction {
  type: 'create_split'
  days: SplitDay[]
  reason: string
}

type Action = ExerciseAction | CreateSplitAction

interface Message {
  role: 'user' | 'ai'
  text: string
  time: string
  action?: Action
  actionApplied?: boolean
  actionDismissed?: boolean
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt() {
  const n = new Date()
  return n.getHours() + ':' + String(n.getMinutes()).padStart(2, '0')
}

function parseAction(raw: string): { text: string; action?: Action } {
  const match = raw.match(/<action>\s*([\s\S]*?)\s*<\/action>/)
  if (!match) return { text: raw.trim() }
  try {
    const action = JSON.parse(match[1]) as Action
    const text = raw.replace(/<action>[\s\S]*?<\/action>/, '').trim()
    return { text, action }
  } catch {
    return { text: raw.trim() }
  }
}

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']

const SUGGESTIONS = [
  'Build me a full week PPL split',
  'Design a 4-day upper/lower program',
  'Should I train today?',
  'Add an isolation move to my push day',
  'Swap my bench press for something safer',
  'Why is my HRV low?',
]

// ── Component ─────────────────────────────────────────────────────────────────
export default function AICoach() {
  const { state, setState } = useApp()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const chatRef = useRef<HTMLDivElement>(null)

  function scrollBottom() {
    setTimeout(() => {
      if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight
    }, 50)
  }

  useEffect(scrollBottom, [messages, loading])

  // ── Apply single-exercise action ───────────────────────────────────────────
  function applyAction(msgIdx: number, action: ExerciseAction) {
    setState(prev => {
      const plan = prev.workoutPlan.map((wd, i) => {
        if (i !== action.dayIndex) return wd

        const existing: Exercise[] = wd.exercises ?? []
        const newEx: Exercise = {
          id: `ai_${Date.now()}`,
          name: action.exercise.name,
          sets: action.exercise.sets,
          reps: action.exercise.reps,
          weight: action.exercise.weight,
          restSec: action.exercise.restSec,
          sets_logged: [],
        }

        let updated: Exercise[]
        if (action.type === 'replace_exercise' && action.replacesName) {
          const replaceIdx = existing.findIndex(
            e => e.name.toLowerCase() === action.replacesName!.toLowerCase()
          )
          if (replaceIdx >= 0) {
            updated = [...existing]
            updated[replaceIdx] = newEx
          } else {
            updated = [...existing, newEx]
          }
        } else {
          updated = [...existing, newEx]
        }

        return { ...wd, exercises: updated }
      })

      const targetDay = plan[action.dayIndex]
      let todayExercises = prev.todayExercises
      if (targetDay?.isToday) {
        const newEx: Exercise = {
          id: `ai_${Date.now()}`,
          name: action.exercise.name,
          sets: action.exercise.sets,
          reps: action.exercise.reps,
          weight: action.exercise.weight,
          restSec: action.exercise.restSec,
          sets_logged: [],
        }
        if (action.type === 'replace_exercise' && action.replacesName) {
          const replaceIdx = todayExercises.findIndex(
            e => e.name.toLowerCase() === action.replacesName!.toLowerCase()
          )
          if (replaceIdx >= 0) {
            todayExercises = todayExercises.map((e, i) => i === replaceIdx ? newEx : e)
          } else {
            todayExercises = [...todayExercises, newEx]
          }
        } else {
          todayExercises = [...todayExercises, newEx]
        }
      }

      return { ...prev, workoutPlan: plan, todayExercises }
    })

    setMessages(prev =>
      prev.map((m, i) => i === msgIdx ? { ...m, actionApplied: true } : m)
    )
  }

  // ── Apply full split action ────────────────────────────────────────────────
  function applyCreateSplit(msgIdx: number, action: CreateSplitAction) {
    setState(prev => {
      const newPlan = DAYS.map((dayLabel, i) => {
        const incoming = action.days.find(d => d.dayIndex === i)
        const existing = prev.workoutPlan[i]

        if (!incoming) {
          return existing ?? { day: dayLabel, name: 'Rest', muscle: '', type: 'rest' as WorkoutType, done: false }
        }

        const exercises: Exercise[] = incoming.exercises.map((ex, j) => ({
          id: `ai_${Date.now()}_${i}_${j}`,
          name: ex.name,
          sets: ex.sets,
          reps: ex.reps,
          weight: ex.weight,
          restSec: ex.restSec,
          sets_logged: [],
        }))

        return {
          day: dayLabel,
          name: incoming.dayName,
          muscle: incoming.muscle,
          type: incoming.workoutType,
          done: existing?.done ?? false,
          isToday: existing?.isToday ?? false,
          exercises,
        }
      })

      const todayPlan = newPlan.find(d => d.isToday)
      const todayExercises = todayPlan?.exercises ?? prev.todayExercises

      return { ...prev, workoutPlan: newPlan, todayExercises, activeSplitId: 'ai_custom' }
    })

    setMessages(prev =>
      prev.map((m, i) => i === msgIdx ? { ...m, actionApplied: true } : m)
    )
  }

  function dismissAction(msgIdx: number) {
    setMessages(prev =>
      prev.map((m, i) => i === msgIdx ? { ...m, actionDismissed: true } : m)
    )
  }

  // ── Send message ──────────────────────────────────────────────────────────
  async function send(text: string) {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    const userMsg: Message = { role: 'user', text: trimmed, time: fmt() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const body = {
        message: trimmed,
        context: {
          profile: state.profile,
          recovery: state.recovery,
          todayMeals: state.today.meals,
          weeklyVolume: state.weeklyVolume,
          workoutPlan: state.workoutPlan.map((wd, i) => ({
            dayIndex: i,
            day: wd.day,
            name: wd.name,
            type: wd.type,
            isToday: wd.isToday,
            exercises: (wd.exercises ?? []).map(e => ({ id: e.id, name: e.name, sets: e.sets, reps: e.reps })),
          })),
          todayExercises: state.todayExercises.map(e => ({ id: e.id, name: e.name, sets: e.sets, reps: e.reps })),
        },
        history: messages.map(m => ({
          role: m.role === 'ai' ? 'assistant' : 'user',
          content: m.text + (m.action && !m.actionDismissed ? ` [ACTION: ${JSON.stringify(m.action)}]` : ''),
        })),
      }

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) throw new Error('API error')
      const data = await res.json()
      const raw = data.response || data.reply || 'No response received.'
      const { text: cleanText, action } = parseAction(raw)

      setMessages(prev => [...prev, { role: 'ai', text: cleanText, time: fmt(), action }])
    } catch {
      setMessages(prev => [
        ...prev,
        { role: 'ai', text: 'Connection error. Please check your network and try again.', time: fmt() },
      ])
    } finally {
      setLoading(false)
    }
  }

  // ── Render action card ─────────────────────────────────────────────────────
  function renderActionCard(m: Message, i: number) {
    if (!m.action || m.actionDismissed) return null
    const action = m.action

    if (action.type === 'create_split') {
      const trainingDays = action.days.filter(d => d.workoutType !== 'rest')
      return (
        <div className="action-card">
          <div className="action-card-header">
            <span className="action-card-verb">✦ FULL WEEK SPLIT</span>
            <span className="action-card-day">{trainingDays.length} TRAINING DAYS</span>
          </div>

          <div className="split-preview">
            {action.days.map(day => (
              <div key={day.dayIndex} className={`split-preview-day ${day.workoutType === 'rest' ? 'split-rest-day' : ''}`}>
                <div className="split-preview-header">
                  <span className="split-preview-label">{DAYS[day.dayIndex]}</span>
                  <span className="split-preview-name">{day.dayName}</span>
                </div>
                {day.exercises.length > 0 ? (
                  <div className="split-preview-exercises">
                    {day.exercises.map((ex, j) => (
                      <div key={j} className="split-preview-ex">
                        <span className="split-preview-ex-name">{ex.name}</span>
                        <span className="split-preview-ex-spec">{ex.sets}×{ex.reps}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="split-preview-rest-label">Rest &amp; recovery</div>
                )}
              </div>
            ))}
          </div>

          <div className="action-card-reason">"{action.reason}"</div>

          {m.actionApplied ? (
            <div className="action-card-applied">✓ Full split applied to your program</div>
          ) : (
            <div className="action-card-buttons">
              <button
                className="action-card-apply"
                onClick={() => applyCreateSplit(i, action)}
              >
                Apply Full Split
              </button>
              <button
                className="action-card-dismiss"
                onClick={() => dismissAction(i)}
              >
                Dismiss
              </button>
            </div>
          )}
        </div>
      )
    }

    return (
      <div className="action-card">
        <div className="action-card-header">
          <span className="action-card-verb">
            {action.type === 'replace_exercise' ? '⇄ SWAP IN' : '✦ ADD TO'}
          </span>
          <span className="action-card-day">{action.dayName.toUpperCase()}</span>
        </div>

        {action.type === 'replace_exercise' && action.replacesName && (
          <div className="action-card-replaces">replaces {action.replacesName}</div>
        )}

        <div className="action-card-name">{action.exercise.name}</div>

        <div className="action-card-specs">
          <span>{action.exercise.sets} sets</span>
          <span className="action-card-dot">·</span>
          <span>{action.exercise.reps} reps</span>
          <span className="action-card-dot">·</span>
          <span>{action.exercise.weight > 0 ? fmtWeight(action.exercise.weight, state.weightUnit) : 'bodyweight'}</span>
          <span className="action-card-dot">·</span>
          <span>{action.exercise.restSec}s rest</span>
        </div>

        <div className="action-card-reason">"{action.reason}"</div>

        {m.actionApplied ? (
          <div className="action-card-applied">✓ Applied to {action.dayName}</div>
        ) : (
          <div className="action-card-buttons">
            <button
              className="action-card-apply"
              onClick={() => applyAction(i, action as ExerciseAction)}
            >
              Apply to Split
            </button>
            <button
              className="action-card-dismiss"
              onClick={() => dismissAction(i)}
            >
              Dismiss
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="ai-outer">
      <div className="ai-page-header">
        <div className="eyebrow">AI Coach</div>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 32, fontWeight: 300, lineHeight: 1.1 }}>
          Ask me<br /><em style={{ color: 'var(--copper)' }}>anything.</em>
        </div>
      </div>

      <div className="chat-area" ref={chatRef} style={{ flex: 1 }}>
        {messages.length === 0 && (
          <div className="suggestion-chips">
            {SUGGESTIONS.map(s => (
              <button key={s} className="suggestion-chip" onClick={() => send(s)}>{s}</button>
            ))}
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`chat-msg ${m.role}`}>
            <div className="chat-bubble">{m.text}</div>
            {m.role === 'ai' && renderActionCard(m, i)}
            <div className="chat-ts">{m.time}</div>
          </div>
        ))}

        {loading && (
          <div className="chat-msg ai">
            <div className="chat-bubble" style={{ padding: 0 }}>
              <div className="typing-bubble">
                <div className="typing-dot" />
                <div className="typing-dot" />
                <div className="typing-dot" />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="chat-input-row">
        <input
          className="chat-inp"
          placeholder="Ask your AI coach…"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') send(input) }}
          disabled={loading}
        />
        <button className="chat-send" onClick={() => send(input)} disabled={loading}>↑</button>
      </div>
    </div>
  )
}
