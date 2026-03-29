import { useState } from 'react'
import { saveProfile } from '../lib/db'

interface Props {
  userId: string
  onComplete: () => void
}

type Goal = 'bulk' | 'cut' | 'maintain'
type Exp  = 'beginner' | 'intermediate' | 'advanced'

const COMMON_SUPPS = [
  { icon: '⚡', name: 'Creatine' },
  { icon: '🌊', name: 'Omega-3' },
  { icon: '☀️', name: 'Vitamin D3' },
  { icon: '💊', name: 'Magnesium' },
  { icon: '🥛', name: 'Whey Protein' },
  { icon: '🫀', name: 'Caffeine' },
  { icon: '💪', name: 'Beta-Alanine' },
  { icon: '🦴', name: 'Zinc' },
]

export default function Onboarding({ userId, onComplete }: Props) {
  const [step, setStep] = useState(1)
  const TOTAL = 4

  // Step 1
  const [name, setName] = useState('')

  // Step 2
  const [age, setAge]           = useState('')
  const [weight, setWeight]     = useState('')
  const [height, setHeight]     = useState('')
  const [weightUnit, setWU]     = useState<'kg' | 'lbs'>('kg')
  const [heightUnit, setHU]     = useState<'cm' | 'ft'>('cm')

  // Step 3
  const [goal, setGoal]   = useState<Goal>('bulk')
  const [exp, setExp]     = useState<Exp>('intermediate')

  // Step 4 — auto-calculated, user can adjust
  const [saving, setSaving] = useState(false)
  const [selectedSupps, setSelectedSupps] = useState<string[]>([])

  const wKg = weightUnit === 'kg' ? parseFloat(weight) : parseFloat(weight) / 2.205
  const hCm = heightUnit === 'cm' ? parseFloat(height) : parseFloat(height) * 30.48

  function calcTargets() {
    const w = wKg || 80
    const h = hCm || 175
    const a = parseInt(age) || 25
    const bmr = 10 * w + 6.25 * h - 5 * a + 5
    const tdee = Math.round(bmr * 1.55)
    const calories = goal === 'bulk' ? tdee + 300 : goal === 'cut' ? tdee - 500 : tdee
    const protein  = Math.round(w * 2.0)
    return { calories, protein }
  }

  const { calories: autoCalories, protein: autoProtein } = calcTargets()
  const [calories, setCalories] = useState(0)
  const [protein,  setProtein]  = useState(0)

  function goToStep4() {
    const t = calcTargets()
    setCalories(t.calories)
    setProtein(t.protein)
    setStep(4)
  }

  function toggleSupp(name: string) {
    setSelectedSupps(prev =>
      prev.includes(name) ? prev.filter(s => s !== name) : [...prev, name]
    )
  }

  async function finish() {
    setSaving(true)
    const suppObjects = selectedSupps.map(n => {
      const found = COMMON_SUPPS.find(s => s.name === n)
      return { icon: found?.icon ?? '💊', name: n, dose: '', desc: '', time: 'morning' }
    })

    await saveProfile(userId, {
      name:            name.trim(),
      age:             parseInt(age) || 25,
      weight:          wKg || 80,
      height:          hCm || 175,
      goal,
      exp,
      calorie_target:  calories || autoCalories,
      protein_target:  protein  || autoProtein,
      weight_unit:     weightUnit,
      height_unit:     heightUnit,
      supplements:     suppObjects,
      onboarded:       true,
    })
    onComplete()
  }

  return (
    <div style={s.wrap}>
      {/* Progress */}
      <div style={s.progress}>
        {Array.from({ length: TOTAL }, (_, i) => (
          <div key={i} style={{
            ...s.dot,
            background: i < step ? '#B8864E' : 'rgba(245,240,232,0.15)',
          }} />
        ))}
      </div>

      {/* Step 1 — Name */}
      {step === 1 && (
        <div style={s.card}>
          <div style={s.wordmark}>APEX</div>
          <h2 style={s.heading}>What do we call you?</h2>
          <p style={s.sub}>Your coach will use this to personalise every interaction.</p>
          <input
            style={s.input}
            placeholder="First name"
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
          />
          <button style={s.btn} disabled={!name.trim()} onClick={() => setStep(2)}>
            Continue →
          </button>
        </div>
      )}

      {/* Step 2 — Body metrics */}
      {step === 2 && (
        <div style={s.card}>
          <h2 style={s.heading}>Your body</h2>
          <p style={s.sub}>Used to calculate personalised nutrition targets.</p>

          <label style={s.label}>Age</label>
          <input style={s.input} type="number" placeholder="25" value={age} onChange={e => setAge(e.target.value)} />

          <label style={s.label}>Weight</label>
          <div style={s.row}>
            <input style={{ ...s.input, flex: 1 }} type="number" placeholder={weightUnit === 'kg' ? '80' : '176'} value={weight} onChange={e => setWeight(e.target.value)} />
            <div style={s.toggle}>
              {(['kg', 'lbs'] as const).map(u => (
                <button key={u} style={{ ...s.toggleBtn, background: weightUnit === u ? '#B8864E' : 'transparent', color: weightUnit === u ? '#1A1714' : 'rgba(245,240,232,0.5)' }} onClick={() => setWU(u)}>{u}</button>
              ))}
            </div>
          </div>

          <label style={s.label}>Height</label>
          <div style={s.row}>
            <input style={{ ...s.input, flex: 1 }} type="number" placeholder={heightUnit === 'cm' ? '175' : '5.9'} value={height} onChange={e => setHeight(e.target.value)} />
            <div style={s.toggle}>
              {(['cm', 'ft'] as const).map(u => (
                <button key={u} style={{ ...s.toggleBtn, background: heightUnit === u ? '#B8864E' : 'transparent', color: heightUnit === u ? '#1A1714' : 'rgba(245,240,232,0.5)' }} onClick={() => setHU(u)}>{u}</button>
              ))}
            </div>
          </div>

          <div style={s.navRow}>
            <button style={s.backBtn} onClick={() => setStep(1)}>← Back</button>
            <button style={s.btn} onClick={() => setStep(3)}>Continue →</button>
          </div>
        </div>
      )}

      {/* Step 3 — Goal & Experience */}
      {step === 3 && (
        <div style={s.card}>
          <h2 style={s.heading}>Your training</h2>
          <p style={s.sub}>This shapes your coaching, programming, and nutrition.</p>

          <label style={s.label}>Primary goal</label>
          <div style={s.chips}>
            {([['bulk', 'Build muscle'], ['cut', 'Lose fat'], ['maintain', 'Stay lean']] as [Goal, string][]).map(([v, label]) => (
              <button key={v} style={{ ...s.chip, ...(goal === v ? s.chipActive : {}) }} onClick={() => setGoal(v)}>{label}</button>
            ))}
          </div>

          <label style={{ ...s.label, marginTop: 20 }}>Experience level</label>
          <div style={s.chips}>
            {([['beginner', 'Beginner\n0–1 yr'], ['intermediate', 'Intermediate\n1–3 yrs'], ['advanced', 'Advanced\n3+ yrs']] as [Exp, string][]).map(([v, label]) => (
              <button key={v} style={{ ...s.chip, ...(exp === v ? s.chipActive : {}), whiteSpace: 'pre-line', lineHeight: 1.3 }} onClick={() => setExp(v)}>{label}</button>
            ))}
          </div>

          <div style={s.navRow}>
            <button style={s.backBtn} onClick={() => setStep(2)}>← Back</button>
            <button style={s.btn} onClick={goToStep4}>Continue →</button>
          </div>
        </div>
      )}

      {/* Step 4 — Targets + Supplements */}
      {step === 4 && (
        <div style={s.card}>
          <h2 style={s.heading}>Your targets</h2>
          <p style={s.sub}>Calculated from your stats. Adjust if needed.</p>

          <div style={s.targetRow}>
            <div style={s.target}>
              <div style={s.targetVal}>
                <input style={s.targetInput} type="number" value={calories} onChange={e => setCalories(parseInt(e.target.value) || 0)} />
              </div>
              <div style={s.targetLabel}>kcal / day</div>
            </div>
            <div style={s.target}>
              <div style={s.targetVal}>
                <input style={s.targetInput} type="number" value={protein} onChange={e => setProtein(parseInt(e.target.value) || 0)} />
              </div>
              <div style={s.targetLabel}>protein (g)</div>
            </div>
          </div>

          <label style={{ ...s.label, marginTop: 20 }}>Current supplements <span style={{ color: 'rgba(245,240,232,0.3)', fontWeight: 400 }}>(optional)</span></label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
            {COMMON_SUPPS.map(({ icon, name }) => {
              const on = selectedSupps.includes(name)
              return (
                <button key={name} onClick={() => toggleSupp(name)} style={{
                  padding: '7px 14px', borderRadius: 20, fontSize: 13, cursor: 'pointer',
                  background: on ? 'rgba(184,134,78,0.15)' : 'rgba(245,240,232,0.05)',
                  border: on ? '1px solid rgba(184,134,78,0.5)' : '1px solid rgba(245,240,232,0.1)',
                  color: on ? '#B8864E' : 'rgba(245,240,232,0.6)',
                }}>
                  {icon} {name}
                </button>
              )
            })}
          </div>

          <div style={s.navRow}>
            <button style={s.backBtn} onClick={() => setStep(3)}>← Back</button>
            <button style={{ ...s.btn, opacity: saving ? 0.6 : 1 }} disabled={saving} onClick={finish}>
              {saving ? 'Saving…' : 'Start training →'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  wrap: {
    position: 'fixed', inset: 0,
    background: '#1A1714',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    padding: '24px 20px', overflowY: 'auto',
  },
  progress: {
    display: 'flex', gap: 8, marginBottom: 32,
  },
  dot: {
    width: 28, height: 4, borderRadius: 2,
    transition: 'background 0.3s',
  },
  wordmark: {
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    fontSize: 36, fontWeight: 300, letterSpacing: 10,
    color: '#F5F0E8', marginBottom: 24, textAlign: 'center',
  },
  card: {
    width: '100%', maxWidth: 380,
    display: 'flex', flexDirection: 'column',
  },
  heading: {
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    fontSize: 28, fontWeight: 300, color: '#F5F0E8',
    margin: '0 0 8px',
  },
  sub: {
    fontSize: 13, color: 'rgba(245,240,232,0.4)',
    margin: '0 0 24px', lineHeight: 1.5,
  },
  label: {
    fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase',
    color: 'rgba(245,240,232,0.4)', marginBottom: 8, fontWeight: 600,
    display: 'block',
  },
  input: {
    width: '100%', padding: '13px 16px', marginBottom: 16,
    background: 'rgba(245,240,232,0.06)',
    border: '1px solid rgba(245,240,232,0.1)',
    borderRadius: 12, color: '#F5F0E8', fontSize: 15,
    outline: 'none', boxSizing: 'border-box',
  },
  row: {
    display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16,
  },
  toggle: {
    display: 'flex', background: 'rgba(245,240,232,0.06)',
    border: '1px solid rgba(245,240,232,0.1)',
    borderRadius: 10, overflow: 'hidden', flexShrink: 0,
  },
  toggleBtn: {
    padding: '10px 14px', border: 'none', cursor: 'pointer',
    fontSize: 13, fontWeight: 600, transition: 'all 0.2s',
  },
  chips: {
    display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8,
  },
  chip: {
    padding: '10px 18px', borderRadius: 12, fontSize: 13, cursor: 'pointer',
    background: 'rgba(245,240,232,0.05)',
    border: '1px solid rgba(245,240,232,0.1)',
    color: 'rgba(245,240,232,0.5)',
    transition: 'all 0.2s',
  },
  chipActive: {
    background: 'rgba(184,134,78,0.15)',
    border: '1px solid rgba(184,134,78,0.5)',
    color: '#B8864E',
  },
  targetRow: {
    display: 'flex', gap: 12, marginBottom: 8,
  },
  target: {
    flex: 1, background: 'rgba(245,240,232,0.04)',
    border: '1px solid rgba(245,240,232,0.08)',
    borderRadius: 16, padding: '16px', textAlign: 'center',
  },
  targetVal: { marginBottom: 4 },
  targetInput: {
    background: 'none', border: 'none', outline: 'none',
    color: '#B8864E', fontSize: 28, fontWeight: 600,
    textAlign: 'center', width: '100%',
    fontFamily: "'Cormorant Garamond', Georgia, serif",
  },
  targetLabel: {
    fontSize: 11, color: 'rgba(245,240,232,0.3)',
    textTransform: 'uppercase', letterSpacing: 1,
  },
  btn: {
    padding: '14px 28px', background: '#B8864E', border: 'none',
    borderRadius: 12, color: '#1A1714', fontSize: 15, fontWeight: 700,
    cursor: 'pointer', letterSpacing: 0.5, alignSelf: 'flex-end',
  },
  backBtn: {
    padding: '14px 20px', background: 'none',
    border: '1px solid rgba(245,240,232,0.1)',
    borderRadius: 12, color: 'rgba(245,240,232,0.4)',
    fontSize: 14, cursor: 'pointer',
  },
  navRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8,
  },
}
