import { useState, useMemo } from 'react'
import { useApp } from '../../context/AppContext'
import {
  kgToLbs, lbsToKg, fmtWeightVal,
  cmToTotalInches, totalInchesToCm, totalInchesToFtIn,
  HEIGHT_MIN_IN, HEIGHT_MAX_IN,
} from '../../utils/units'
import { calcMaintenance } from '../../utils/calcs'

interface Props {
  open: boolean
  onClose: () => void
  showToast: (msg: string) => void
}

function UnitToggle({
  left, right, isRight, onToggle,
}: { left: string; right: string; isRight: boolean; onToggle: () => void }) {
  return (
    <button
      style={{
        background: 'var(--linen2)',
        border: '1px solid var(--ash3)',
        borderRadius: 20,
        padding: '6px 4px',
        display: 'flex',
        alignItems: 'center',
        cursor: 'pointer',
        width: 72,
        position: 'relative',
        flexShrink: 0,
      }}
      onClick={onToggle}
    >
      <div style={{
        position: 'absolute',
        left: isRight ? 'calc(100% - 34px)' : 4,
        width: 30,
        height: 26,
        background: 'var(--ink)',
        borderRadius: 16,
        transition: 'left .2s cubic-bezier(.4,0,.2,1)',
      }} />
      <span style={{ flex: 1, textAlign: 'center', fontSize: 11, fontWeight: 700, color: !isRight ? 'var(--linen)' : 'var(--ash)', position: 'relative', zIndex: 1 }}>{left}</span>
      <span style={{ flex: 1, textAlign: 'center', fontSize: 11, fontWeight: 700, color: isRight ? 'var(--linen)' : 'var(--ash)', position: 'relative', zIndex: 1 }}>{right}</span>
    </button>
  )
}

export default function ProfileModal({ open, onClose, showToast }: Props) {
  const { state, setState } = useApp()
  const { profile } = state
  const weightUnit = state.weightUnit
  const heightUnit = state.heightUnit

  const [name, setName] = useState(profile.name)
  const [weight, setWeight] = useState(fmtWeightVal(profile.weight, weightUnit))
  const [heightCm, setHeightCm] = useState(String(profile.height))
  const [heightIn, setHeightIn] = useState(cmToTotalInches(profile.height))
  const [goal, setGoal] = useState<'bulk' | 'cut'>(profile.goal)
  const [exp, setExp] = useState(profile.exp)
  const [kcal, setKcal] = useState(String(profile.calorieTarget))
  const [protein, setProtein] = useState(String(profile.proteinTarget))
  const [pinInput, setPinInput] = useState('')
  const [pinError, setPinError] = useState('')

  const { ft, inches } = totalInchesToFtIn(heightIn)
  const weightKg = (() => {
    const raw = parseFloat(weight)
    return raw ? (weightUnit === 'lbs' ? lbsToKg(raw) : raw) : profile.weight
  })()

  const maint = useMemo(() => {
    const previewCm = heightUnit === 'ft'
      ? totalInchesToCm(heightIn)
      : parseFloat(heightCm) || profile.height
    const previewState = {
      ...state,
      profile: {
        ...profile,
        weight: weightKg,
        height: previewCm,
        exp,
      },
    }
    return calcMaintenance(previewState)
  }, [state, weightKg, heightCm, heightIn, heightUnit, exp])

  function save() {
    const rawWeight = parseFloat(weight)
    const savedCm = heightUnit === 'ft'
      ? totalInchesToCm(heightIn)
      : parseFloat(heightCm) || profile.height
    setState(prev => ({
      ...prev,
      profile: {
        name: name.trim() || 'Alex',
        weight: rawWeight
          ? (prev.weightUnit === 'lbs' ? lbsToKg(rawWeight) : rawWeight)
          : prev.profile.weight,
        height: savedCm,
        goal,
        exp,
        calorieTarget: parseInt(kcal) || prev.profile.calorieTarget,
        proteinTarget: parseInt(protein) || prev.profile.proteinTarget,
      },
    }))
    showToast('Profile saved ✓')
    onClose()
  }

  function savePin() {
    const trimmed = pinInput.trim()
    if (!/^\d{4}$/.test(trimmed)) {
      setPinError('PIN must be exactly 4 digits')
      return
    }
    setState(prev => ({ ...prev, pin: trimmed }))
    sessionStorage.removeItem('apex_unlocked')
    setPinInput('')
    setPinError('')
    showToast('PIN updated ✓')
  }

  return (
    <div className={`modal-overlay${open ? ' open' : ''}`} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-sheet">
        <div className="modal-handle" />
        <div className="modal-header">
          <div className="modal-title">Your Profile</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="profile-page" style={{ padding: 0 }}>
            <div className="inp-group">
              <div className="inp-label">Name</div>
              <input className="inp" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className="inp-group">
                <div className="inp-label">Weight ({weightUnit})</div>
                <input className="inp" type="number" value={weight} onChange={e => setWeight(e.target.value)} inputMode="decimal" />
              </div>
              <div className="inp-group">
                {heightUnit === 'cm' ? (
                  <>
                    <div className="inp-label">Height (cm)</div>
                    <input className="inp" type="number" value={heightCm} onChange={e => setHeightCm(e.target.value)} inputMode="numeric" />
                  </>
                ) : (
                  <>
                    <div className="inp-label">Height</div>
                    <div className="inp" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 300, letterSpacing: 0.5 }}>
                      {ft}<span style={{ fontSize: 13, fontWeight: 600, margin: '0 1px 0 0' }}>'</span>{inches}<span style={{ fontSize: 13, fontWeight: 600 }}>"</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {heightUnit === 'ft' && (
              <div style={{ marginBottom: 14 }}>
                <input
                  type="range"
                  min={HEIGHT_MIN_IN}
                  max={HEIGHT_MAX_IN}
                  step={1}
                  value={heightIn}
                  onChange={e => setHeightIn(Number(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--ink)', cursor: 'pointer' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--ash)', marginTop: 2 }}>
                  <span>4'0"</span>
                  <span>5'0"</span>
                  <span>6'0"</span>
                  <span>7'0"</span>
                </div>
              </div>
            )}

            <div className="select-group">
              <div className="select-label">Goal</div>
              <div className="seg-control">
                <button className={`seg-btn${goal === 'bulk' ? ' active' : ''}`} onClick={() => setGoal('bulk')}>Muscle Gain</button>
                <button className={`seg-btn${goal === 'cut' ? ' active' : ''}`} onClick={() => setGoal('cut')}>Fat Loss</button>
              </div>
            </div>
            <div className="select-group">
              <div className="select-label">Experience Level</div>
              <div className="seg-control">
                {['beginner', 'intermediate', 'advanced'].map(e => (
                  <button key={e} className={`seg-btn${exp === e ? ' active' : ''}`} onClick={() => setExp(e)}>
                    {e.charAt(0).toUpperCase() + e.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            {/* ── Maintenance estimate card ── */}
            <div className="maint-card" style={{ borderRadius: 16, padding: '14px 16px', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 10, letterSpacing: 2, color: 'rgba(245,240,232,.4)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>
                    Maintenance Estimate
                  </div>
                  <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 36, fontWeight: 300, color: '#F5F0E8', lineHeight: 1 }}>
                    {maint.kcal.toLocaleString()}
                    <span style={{ fontSize: 13, fontWeight: 400, marginLeft: 4, fontFamily: 'inherit' }}>kcal</span>
                  </div>
                </div>
                <div style={{
                  background: maint.confidence === 'high' ? 'rgba(58,122,92,.25)' : maint.confidence === 'medium' ? 'rgba(184,134,78,.2)' : 'rgba(245,240,232,.08)',
                  borderRadius: 8, padding: '4px 8px',
                  fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
                  color: maint.confidence === 'high' ? '#5DBE8C' : maint.confidence === 'medium' ? '#C8863E' : 'rgba(245,240,232,.45)',
                }}>
                  {maint.confidence === 'formula' ? 'Formula' : maint.confidence === 'high' ? 'High ✓' : maint.confidence === 'medium' ? 'Growing' : 'Early'}
                </div>
              </div>
              <div style={{ fontSize: 11, color: 'rgba(245,240,232,.42)', marginBottom: 12 }}>
                {maint.adjusted && maint.weeklyChangeKg !== null
                  ? `${maint.daysUsed} days tracked · ${Math.abs(maint.weeklyChangeKg)}kg/wk ${maint.trend === 'gaining' ? '↑ gaining' : maint.trend === 'losing' ? '↓ losing' : '→ stable'}`
                  : `${maint.label} · Log daily check-ins to refine`}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {[
                  { label: 'Maintain', delta: 0,    proteinPerKg: 1.8 },
                  { label: 'Bulk',     delta: 250,  proteinPerKg: 2.0 },
                  { label: 'Cut',      delta: -500, proteinPerKg: 2.2 },
                ].map(({ label, delta, proteinPerKg }) => {
                  const kcalTarget = maint.kcal + delta
                  const proteinTarget = Math.round(weightKg * proteinPerKg)
                  return (
                    <button
                      key={label}
                      style={{
                        flex: 1, background: 'rgba(245,240,232,.08)',
                        border: '1px solid rgba(245,240,232,.14)',
                        borderRadius: 10, padding: '8px 4px',
                        cursor: 'pointer', textAlign: 'center',
                      }}
                      onClick={() => {
                        setKcal(String(kcalTarget))
                        setProtein(String(proteinTarget))
                      }}
                    >
                      <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(245,240,232,.8)', marginBottom: 4, letterSpacing: .5 }}>{label}</div>
                      <div style={{ fontSize: 10, color: 'rgba(245,240,232,.45)', lineHeight: 1.5 }}>
                        {kcalTarget.toLocaleString()} kcal
                      </div>
                      <div style={{ fontSize: 10, color: 'rgba(200,144,96,.8)', lineHeight: 1.5 }}>
                        {proteinTarget}g protein
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className="inp-group">
                <div className="inp-label">Calorie Target</div>
                <input className="inp" type="number" value={kcal} onChange={e => setKcal(e.target.value)} inputMode="numeric" />
              </div>
              <div className="inp-group">
                <div className="inp-label">Protein Target (g)</div>
                <input className="inp" type="number" value={protein} onChange={e => setProtein(e.target.value)} inputMode="numeric" />
              </div>
            </div>

            <div className="dark-mode-row">
              <div>
                <div className="dark-mode-row-label">Dark Mode</div>
                <div className="dark-mode-row-sub">Switch between light and dark theme</div>
              </div>
              <button
                className={`dark-mode-pill${state.darkMode ? ' on' : ''}`}
                onClick={() => setState(prev => ({ ...prev, darkMode: !prev.darkMode }))}
              >
                <div className="dark-mode-pill-thumb" />
              </button>
            </div>

            <div className="dark-mode-row">
              <div>
                <div className="dark-mode-row-label">Weight Unit</div>
                <div className="dark-mode-row-sub">Display weights in kg or lbs</div>
              </div>
              <UnitToggle
                left="kg" right="lbs"
                isRight={weightUnit === 'lbs'}
                onToggle={() => {
                  const newUnit = weightUnit === 'kg' ? 'lbs' : 'kg'
                  const parsed = parseFloat(weight)
                  if (parsed) {
                    setWeight(newUnit === 'lbs'
                      ? String(Math.round(kgToLbs(parsed) * 10) / 10)
                      : String(Math.round(lbsToKg(parsed) * 10) / 10))
                  }
                  setState(prev => ({ ...prev, weightUnit: newUnit }))
                }}
              />
            </div>

            <div className="dark-mode-row">
              <div>
                <div className="dark-mode-row-label">Height Unit</div>
                <div className="dark-mode-row-sub">Display height in cm or ft/in</div>
              </div>
              <UnitToggle
                left="cm" right="ft"
                isRight={heightUnit === 'ft'}
                onToggle={() => {
                  const newUnit = heightUnit === 'cm' ? 'ft' : 'cm'
                  if (newUnit === 'ft') {
                    const cm = parseFloat(heightCm) || profile.height
                    setHeightIn(Math.max(HEIGHT_MIN_IN, Math.min(HEIGHT_MAX_IN, cmToTotalInches(cm))))
                  } else {
                    setHeightCm(String(totalInchesToCm(heightIn)))
                  }
                  setState(prev => ({ ...prev, heightUnit: newUnit }))
                }}
              />
            </div>

            <div className="pin-section">
              <div className="pin-section-label">App PIN</div>
              <div className="pin-section-sub">4-digit code required on every open · current: ••••</div>
              <div className="pin-row">
                <input
                  className="inp pin-inp"
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="New PIN"
                  value={pinInput}
                  onChange={e => { setPinInput(e.target.value.replace(/\D/g,'')); setPinError('') }}
                />
                <button className="pin-save-btn" onClick={savePin}>Update</button>
              </div>
              {pinError && <div className="pin-error-msg">{pinError}</div>}
            </div>

            <button className="btn-primary" style={{ marginTop: 8, marginBottom: 12 }} onClick={save}>
              Save Profile
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
