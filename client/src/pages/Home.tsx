import { useApp } from '../context/AppContext'
import { fmtWeight } from '../utils/units'
import { Page } from '../types'

interface Props {
  onNav: (p: Page) => void
  onProfile: () => void
  showToast: (msg: string) => void
  onLogMetrics: () => void
}

function getGreeting(name: string) {
  const h = new Date().getHours()
  const part = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening'
  return { part, name }
}

function getRecoveryVerdict(score: number): { text: string; detail: string } {
  if (score >= 85) return { text: 'Optimal.', detail: 'HRV elevated. MEV loads recommended — push hard today.' }
  if (score >= 70) return { text: 'Good.', detail: 'HRV within baseline. Standard training volume prescribed.' }
  if (score >= 55) return { text: 'Fair.', detail: 'Mild parasympathetic suppression. Reduce intensity ~15%.' }
  return { text: 'Recover.', detail: 'Systemic fatigue detected. Active recovery only recommended.' }
}

export default function Home({ onNav, onProfile, showToast, onLogMetrics }: Props) {
  const { state, setState } = useApp()

  function toggleDark() {
    setState(prev => ({ ...prev, darkMode: !prev.darkMode }))
  }
  const { profile, today, recovery, weeklyVolume, wearables, workoutPlan, todayExercises, metricHistory } = state

  const todayStr = new Date().toISOString().slice(0, 10)
  const todayLogged = metricHistory.some(e => e.date === todayStr)

  const { part, name } = getGreeting(profile.name)
  const { text: verdict, detail } = getRecoveryVerdict(recovery.score)

  const totalKcal = today.meals.reduce((s, m) => s + m.kcal, 0)
  const totalP = today.meals.reduce((s, m) => s + m.p, 0)
  const totalC = today.meals.reduce((s, m) => s + m.c, 0)
  const totalF = today.meals.reduce((s, m) => s + m.f, 0)
  const kcalPct = Math.min(totalKcal / profile.calorieTarget, 1)
  const pPct = Math.min(totalP / profile.proteinTarget, 1)
  const todayPlan = workoutPlan.find(w => w.isToday) || workoutPlan[1]

  const toggleExDone = (id: string) => {
    setState(prev => {
      const done = prev.today.exercisesCompleted
      return {
        ...prev,
        today: {
          ...prev.today,
          exercisesCompleted: done.includes(id) ? done.filter(x => x !== id) : [...done, id],
        },
      }
    })
  }

  return (
    <div className="page active">
      <div className="home-header">
        <div className="wordmark">APEX</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="dark-toggle-btn" onClick={toggleDark} aria-label="Toggle dark mode">
            {state.darkMode ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            )}
          </button>
          <button className="avatar-ring" onClick={onProfile}>
            {profile.name.slice(0, 2).toUpperCase()}
          </button>
        </div>
      </div>

      <div className="hero-section">
        <div className="hero-greeting">
          Good {part},<br /><em>{name}.</em>
        </div>
        <div className="hero-sub">
          {recovery.score >= 85
            ? 'Your recovery is exceptional. Full training capacity available.'
            : recovery.score >= 70
            ? 'Good recovery status. Training as planned.'
            : 'Recovery is suboptimal. Consider modifying today\'s session.'}
        </div>
      </div>

      <div className="readiness-card">
        <div className="rc-top">
          <div>
            <div className="rc-label">AI Readiness</div>
            <div className="rc-verdict">{verdict}</div>
            <div className="rc-detail">{detail}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="rc-score">{recovery.score}</div>
            <div className="rc-score-sub">/ 100</div>
          </div>
        </div>
        <div className="rc-wearables">
          {wearables.map(w => (
            <div key={w.name} className="rc-chip" onClick={() => showToast(`${w.name}: ${w.detail}`)}>
              {w.synced ? <span className="sync-dot" /> : <span className="unsync-dot" />}
              {w.icon} {w.name.split(' ')[0]}
            </div>
          ))}
        </div>
      </div>

      <div className="metric-strip">
        <div className="metric-tile">
          <div className="mt-val">{recovery.hrv}</div>
          <div className="mt-unit">ms</div>
          <div className="mt-label">HRV</div>
        </div>
        <div className="metric-tile">
          <div className="mt-val">{recovery.sleep}</div>
          <div className="mt-unit">hrs</div>
          <div className="mt-label">Sleep</div>
        </div>
        <div className="metric-tile">
          <div className="mt-val">{recovery.rhr}</div>
          <div className="mt-unit">bpm</div>
          <div className="mt-label">RHR</div>
        </div>
        <div className="metric-tile">
          <div className="mt-val">
            {state.weightUnit === 'lbs'
              ? Math.round(profile.weight * 2.20462 * 10) / 10
              : profile.weight}
          </div>
          <div className="mt-unit">{state.weightUnit}</div>
          <div className="mt-label">Weight</div>
        </div>
        <div className="metric-tile">
          <div className="mt-val">{Math.round(weeklyVolume.reduce((s, v) => s + v, 0) / 1000)}k</div>
          <div className="mt-unit">kg</div>
          <div className="mt-label">Vol/Wk</div>
        </div>
      </div>

      {!todayLogged && (
        <div className="section-block" style={{ marginBottom: 16 }}>
          <button className="log-metrics-banner" onClick={onLogMetrics}>
            <div className="lm-left">
              <div className="lm-icon">⚡</div>
              <div>
                <div className="lm-title">Log today's metrics</div>
                <div className="lm-sub">HRV · Sleep · RHR · Weight</div>
              </div>
            </div>
            <div className="lm-arrow">→</div>
          </button>
        </div>
      )}

      <div className="section-block">
        <div className="eyebrow">Today's program</div>
        <div className="plan-card">
          <div className="plan-header">
            <div className="plan-title-row">
              <div className="plan-title">{todayPlan?.name}</div>
              <span className="pill pill-copper">
                {today.exercisesCompleted.length}/{todayExercises.length} sets
              </span>
            </div>
            <div className="plan-sub">{todayPlan?.muscle}</div>
          </div>
          {todayExercises.slice(0, 4).map((ex, i) => (
            <div key={ex.id} className="exercise-row" onClick={() => toggleExDone(ex.id)}>
              <div className="ex-num">{i + 1}</div>
              <div className="ex-info">
                <div className="ex-name">{ex.name}</div>
                <div className="ex-meta">{ex.sets}×{ex.reps} · {fmtWeight(ex.weight, state.weightUnit)}</div>
              </div>
              <div className="ex-sets-badge">{ex.sets}×</div>
              <div className={`check-circle${today.exercisesCompleted.includes(ex.id) ? ' done' : ''}`} />
            </div>
          ))}
          {todayExercises.length > 4 && (
            <div className="exercise-row" style={{ justifyContent: 'center', color: 'var(--ash)', fontSize: 12 }}
              onClick={() => onNav('train')}>
              +{todayExercises.length - 4} more exercises →
            </div>
          )}
          <div className="plan-footer">
            <span style={{ fontSize: 12, color: 'var(--ash)' }}>
              ~{Math.round(todayExercises.reduce((s, e) => s + e.restSec * e.sets, 0) / 60)} min est.
            </span>
            <button className="btn-start" onClick={() => onNav('train')}>
              {today.exercisesCompleted.length > 0 ? 'Continue →' : 'Begin Session →'}
            </button>
          </div>
        </div>
      </div>

      <div className="section-block">
        <div className="eyebrow">Today's insight</div>
        <div className="insight-card">
          <div className="insight-inner">
            <div className="insight-icon">✦</div>
            <div>
              <div className="insight-label">AI COACH</div>
              <div className="insight-body">
                {recovery.score >= 85
                  ? `HRV of ${recovery.hrv}ms is above your baseline — parasympathetic dominance is high. Neuromuscular readiness is optimal; load today's session at prescribed intensity and aim for the top of your rep ranges.`
                  : recovery.score >= 70
                  ? `HRV is within your 7-day baseline (${recovery.hrv}ms). Train as programmed but monitor RPE — if sets feel harder than expected at rep 4-5, reduce load by 10%.`
                  : `HRV of ${recovery.hrv}ms indicates mild sympathetic activation. Reduce today's volume by ~20% and stay at least 3 RIR. Supercompensation requires adequate recovery — don't override the signal.`}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="section-block">
        <div className="eyebrow">Nutrition today</div>
        <div className="macro-snap">
          <div className="macro-snap-top">
            <div>
              <div className="macro-kcal-big">{totalKcal}</div>
              <div style={{ fontSize: 12, color: 'var(--ash)', marginTop: 2 }}>
                of {profile.calorieTarget} kcal
              </div>
            </div>
            <button className="btn-ghost" onClick={() => onNav('nutrition')}>Details →</button>
          </div>

          <div className="macro-bar-row">
            <div className="mb-top">
              <span className="mb-name">Protein</span>
              <span className="mb-val">{totalP}g / {profile.proteinTarget}g</span>
            </div>
            <div className="prog">
              <div className="prog-f" style={{ width: `${pPct * 100}%`, background: 'var(--ink)' }} />
            </div>
          </div>
          <div className="macro-bar-row">
            <div className="mb-top">
              <span className="mb-name">Carbs</span>
              <span className="mb-val">{totalC}g</span>
            </div>
            <div className="prog">
              <div className="prog-f" style={{ width: `${Math.min(totalC / 250, 1) * 100}%`, background: 'var(--copper)' }} />
            </div>
          </div>
          <div className="macro-bar-row">
            <div className="mb-top">
              <span className="mb-name">Fats</span>
              <span className="mb-val">{totalF}g</span>
            </div>
            <div className="prog">
              <div className="prog-f" style={{ width: `${Math.min(totalF / 80, 1) * 100}%`, background: 'var(--blue)' }} />
            </div>
          </div>
        </div>
      </div>
      <div className="bottom-spacer" />
    </div>
  )
}
