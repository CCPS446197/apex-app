import { useApp } from '../context/AppContext'
import { Meal } from '../types'
import { calcMaintenance } from '../utils/calcs'

interface Props {
  onAddMeal: () => void
  showToast: (msg: string) => void
}

export default function Nutrition({ onAddMeal, showToast }: Props) {
  const { state, setState } = useApp()
  const { today, profile } = state

  const maint = calcMaintenance(state)
  const totalKcal = today.meals.reduce((s, m) => s + m.kcal, 0)
  const totalP = today.meals.reduce((s, m) => s + m.p, 0)
  const totalC = today.meals.reduce((s, m) => s + m.c, 0)
  const totalF = today.meals.reduce((s, m) => s + m.f, 0)

  const circumference = 2 * Math.PI * 75 // r=75
  const pct = Math.min(totalKcal / profile.calorieTarget, 1)
  const proteinPct = Math.min(totalP / profile.proteinTarget, 1)

  const ringOffset = (pct: number) => circumference * (1 - pct)

  const deleteMeal = (i: number) => {
    setState(prev => ({
      ...prev,
      today: { ...prev.today, meals: prev.today.meals.filter((_, idx) => idx !== i) },
    }))
    showToast('Meal removed')
  }

  return (
    <div className="page active">
      <div style={{ padding: '20px 24px 10px' }}>
        <div className="eyebrow">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </div>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 34, fontWeight: 300, lineHeight: 1.1 }}>
          Fuel your<br /><em style={{ color: 'var(--copper)' }}>recovery.</em>
        </div>
      </div>

      <div className="big-ring-wrap">
        <svg width="190" height="190" className="ring-svg" viewBox="0 0 190 190">
          <circle className="ring-bg" cx="95" cy="95" r="75" strokeWidth="11" />
          <circle
            cx="95" cy="95" r="75" fill="none" stroke="var(--ink)" strokeWidth="11"
            strokeLinecap="round" strokeDasharray={circumference}
            strokeDashoffset={ringOffset(pct)}
            style={{ transition: 'stroke-dashoffset .8s cubic-bezier(.4,0,.2,1)' }}
          />
          <circle
            cx="95" cy="95" r="75" fill="none" stroke="var(--copper)" strokeWidth="7"
            strokeLinecap="round" strokeDasharray={circumference}
            strokeDashoffset={ringOffset(Math.min(totalC / 250, 1))}
            opacity=".75"
            style={{ transition: 'stroke-dashoffset .8s cubic-bezier(.4,0,.2,1)' }}
          />
          <circle
            cx="95" cy="95" r="75" fill="none" stroke="var(--blue)" strokeWidth="4"
            strokeLinecap="round" strokeDasharray={circumference}
            strokeDashoffset={ringOffset(Math.min(totalF / 80, 1))}
            opacity=".6"
            style={{ transition: 'stroke-dashoffset .8s cubic-bezier(.4,0,.2,1)' }}
          />
        </svg>
        <div className="ring-center">
          <div className="ring-kcal">{totalKcal}</div>
          <div className="ring-sub">of {profile.calorieTarget} kcal</div>
        </div>
      </div>

      <div className="macro-grid-3">
        <div className="macro-tile">
          <div className="macro-tile-val" style={{ color: 'var(--ink)' }}>{totalP}g</div>
          <div className="macro-tile-label">Protein</div>
          <div style={{ marginTop: 6 }}>
            <div className="prog">
              <div className="prog-f" style={{ width: `${proteinPct * 100}%`, background: 'var(--ink)' }} />
            </div>
          </div>
        </div>
        <div className="macro-tile">
          <div className="macro-tile-val" style={{ color: 'var(--copper)' }}>{totalC}g</div>
          <div className="macro-tile-label">Carbs</div>
          <div style={{ marginTop: 6 }}>
            <div className="prog">
              <div className="prog-f" style={{ width: `${Math.min(totalC / 250, 1) * 100}%`, background: 'var(--copper)' }} />
            </div>
          </div>
        </div>
        <div className="macro-tile">
          <div className="macro-tile-val" style={{ color: 'var(--blue)' }}>{totalF}g</div>
          <div className="macro-tile-label">Fats</div>
          <div style={{ marginTop: 6 }}>
            <div className="prog">
              <div className="prog-f" style={{ width: `${Math.min(totalF / 80, 1) * 100}%`, background: 'var(--blue)' }} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Maintenance reference bar ── */}
      <div style={{ padding: '0 24px', marginBottom: 16 }}>
        <div className="maint-bar">
          <div>
            <div style={{ fontSize: 10, letterSpacing: 1.5, color: 'var(--ash)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>
              Est. Maintenance
            </div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 300, lineHeight: 1 }}>
              {maint.kcal.toLocaleString()} <span style={{ fontSize: 12, fontFamily: 'inherit' }}>kcal</span>
            </div>
          </div>
          <div style={{ flex: 1, textAlign: 'right' }}>
            {(() => {
              const diff = totalKcal - maint.kcal
              const isSurplus = diff > 0
              const color = Math.abs(diff) < 100 ? 'var(--green)' : isSurplus ? 'var(--copper)' : 'var(--blue)'
              return (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color }}>
                    {Math.abs(diff) < 100 ? '≈ Maintenance' : isSurplus ? `+${diff} surplus` : `${diff} deficit`}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--ash)', marginTop: 1 }}>
                    {maint.adjusted ? `${maint.label}` : maint.label}
                  </div>
                </div>
              )
            })()}
          </div>
          <div style={{
            width: 7, height: 7, borderRadius: '50%',
            background: maint.confidence === 'high' ? 'var(--green)' : maint.confidence === 'medium' ? 'var(--copper)' : 'var(--ash3)',
            flexShrink: 0,
          }} />
        </div>
      </div>

      <div style={{ padding: '0 24px', marginBottom: 20 }}>
        <div className="eyebrow">Meals today</div>
        <div className="card" style={{ padding: '0 16px', borderRadius: 20 }}>
          {today.meals.map((meal, i) => (
            <div key={i} className="meal-item">
              <div className="meal-icon">{meal.icon}</div>
              <div className="meal-info">
                <div className="meal-name-text">{meal.name}</div>
                <div className="meal-macros">{meal.items}</div>
                <div className="meal-macros" style={{ marginTop: 2 }}>
                  P {meal.p}g · C {meal.c}g · F {meal.f}g
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="meal-kcal">{meal.kcal}</div>
                <div style={{ fontSize: 10, color: 'var(--ash)' }}>kcal</div>
                <button
                  onClick={() => deleteMeal(i)}
                  style={{ fontSize: 11, color: 'var(--ash)', background: 'none', border: 'none', cursor: 'pointer', marginTop: 4 }}
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>

        <button className="add-meal-btn" onClick={onAddMeal}>
          <span style={{ fontSize: 18 }}>+</span> Add meal / Scan food
        </button>
      </div>

      <div style={{ padding: '0 24px', marginBottom: 20 }}>
        <div className="eyebrow">Daily targets</div>
        <div className="card" style={{ borderRadius: 20 }}>
          {[
            { label: 'Calories', val: `${totalKcal} / ${profile.calorieTarget} kcal`, pct: pct },
            { label: 'Protein', val: `${totalP} / ${profile.proteinTarget}g`, pct: proteinPct },
            { label: 'Carbohydrates', val: `${totalC}g`, pct: Math.min(totalC / 250, 1) },
            { label: 'Fats', val: `${totalF}g`, pct: Math.min(totalF / 80, 1) },
          ].map(({ label, val, pct: p }) => (
            <div key={label} style={{ padding: '12px 18px', borderBottom: '1px solid var(--ash3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{label}</span>
                <span style={{ fontSize: 12, color: 'var(--ash)', fontWeight: 600 }}>{val}</span>
              </div>
              <div className="prog">
                <div className="prog-f" style={{
                  width: `${p * 100}%`,
                  background: label === 'Protein' ? 'var(--ink)' : label === 'Carbohydrates' ? 'var(--copper)' : label === 'Fats' ? 'var(--blue)' : 'var(--green)',
                }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="bottom-spacer" />
    </div>
  )
}
