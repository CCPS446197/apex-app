import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import { Supplement, Peptide } from '../../types'
import { searchSupplements, searchPeptides, SuppCatalogEntry, PepCatalogEntry } from '../../data/catalog'

interface Props {
  open: boolean
  onClose: () => void
  showToast: (msg: string) => void
}

type Tab = 'supplements' | 'peptides'

type EditMode =
  | { type: 'none' }
  | { type: 'add-supp' }
  | { type: 'edit-supp'; idx: number }
  | { type: 'add-pep' }
  | { type: 'edit-pep'; idx: number }

const ICONS = ['⚡','🌊','☀️','💥','🫀','🥛','💊','🧪','🌿','🍊','🫐','🥩','🐟','🧠','🦴','🫁','🫧','💪','🔬','🧬','🌱','🧊','🍋','🌙']

const TIMING_OPTIONS = [
  { value: 'morning',    label: 'Morning' },
  { value: 'preworkout', label: 'Pre-Workout' },
  { value: 'night',      label: 'Night' },
  { value: 'anytime',    label: 'Anytime' },
]

const TIMING_ORDER = ['morning', 'preworkout', 'night', 'anytime']

const EMPTY_SUPP: Supplement = { icon: '💊', name: '', dose: '', desc: '', time: 'morning' }
const EMPTY_PEP: Peptide     = { name: '', cls: '', dose: '', route: '', cycle: '', half: '' }

export default function StackManagerModal({ open, onClose, showToast }: Props) {
  const { state, setState } = useApp()

  const [tab, setTab]       = useState<Tab>('supplements')
  const [edit, setEdit]     = useState<EditMode>({ type: 'none' })
  const [suppForm, setSuppForm] = useState<Supplement>(EMPTY_SUPP)
  const [pepForm,  setPepForm]  = useState<Peptide>(EMPTY_PEP)
  const [suppHints, setSuppHints] = useState<SuppCatalogEntry[]>([])
  const [pepHints,  setPepHints]  = useState<PepCatalogEntry[]>([])

  if (!open) return null

  const { supplements, peptides, today } = state

  // ── helpers ────────────────────────────────────────────────────────────
  function openAddSupp() {
    setSuppForm({ ...EMPTY_SUPP })
    setSuppHints([])
    setEdit({ type: 'add-supp' })
  }

  function openEditSupp(idx: number) {
    setSuppForm({ ...supplements[idx] })
    setSuppHints([])
    setEdit({ type: 'edit-supp', idx })
  }

  function openAddPep() {
    setPepForm({ ...EMPTY_PEP })
    setPepHints([])
    setEdit({ type: 'add-pep' })
  }

  function openEditPep(idx: number) {
    setPepForm({ ...peptides[idx] })
    setPepHints([])
    setEdit({ type: 'edit-pep', idx })
  }

  function cancelEdit() {
    setEdit({ type: 'none' })
    setSuppHints([])
    setPepHints([])
  }

  // ── supplement CRUD ────────────────────────────────────────────────────
  function saveSupp() {
    if (!suppForm.name.trim()) return
    setState(prev => {
      let next: Supplement[]
      if (edit.type === 'add-supp') {
        next = [...prev.supplements, suppForm]
      } else if (edit.type === 'edit-supp') {
        next = prev.supplements.map((s, i) => i === edit.idx ? suppForm : s)
      } else return prev
      return { ...prev, supplements: next }
    })
    showToast(edit.type === 'add-supp' ? `${suppForm.name} added ✓` : `${suppForm.name} updated ✓`)
    setEdit({ type: 'none' })
  }

  function deleteSupp(idx: number) {
    const name = supplements[idx].name
    setState(prev => ({
      ...prev,
      supplements: prev.supplements.filter((_, i) => i !== idx),
      today: { ...prev.today, suppsTaken: prev.today.suppsTaken.filter(n => n !== name) },
    }))
    if (edit.type === 'edit-supp' && edit.idx === idx) setEdit({ type: 'none' })
    showToast(`${name} removed`)
  }

  // ── peptide CRUD ───────────────────────────────────────────────────────
  function savePep() {
    if (!pepForm.name.trim()) return
    setState(prev => {
      let next: Peptide[]
      if (edit.type === 'add-pep') {
        next = [...prev.peptides, pepForm]
      } else if (edit.type === 'edit-pep') {
        next = prev.peptides.map((p, i) => i === edit.idx ? pepForm : p)
      } else return prev
      return { ...prev, peptides: next }
    })
    showToast(edit.type === 'add-pep' ? `${pepForm.name} added ✓` : `${pepForm.name} updated ✓`)
    setEdit({ type: 'none' })
  }

  function deletePep(idx: number) {
    const name = peptides[idx].name
    setState(prev => ({ ...prev, peptides: prev.peptides.filter((_, i) => i !== idx) }))
    if (edit.type === 'edit-pep' && edit.idx === idx) setEdit({ type: 'none' })
    showToast(`${name} removed`)
  }

  // ── shared input style ─────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    padding: '9px 12px', borderRadius: 9,
    border: '1.5px solid var(--ash3)',
    background: 'var(--white)', color: 'var(--ink)',
    fontSize: 13, fontFamily: 'inherit',
    outline: 'none',
  }
  const labelStyle: React.CSSProperties = {
    fontSize: 10, fontWeight: 700, letterSpacing: .8,
    color: 'var(--ash)', marginBottom: 5, display: 'block',
  }

  // ── SUPPLEMENT FORM ────────────────────────────────────────────────────
  function renderSuppForm(isAdd: boolean) {
    return (
      <div style={{
        padding: 16, borderRadius: 14,
        background: 'var(--white)',
        border: '1.5px solid var(--ink)',
        marginBottom: 12,
      }}>
        <div style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 17, fontWeight: 600, color: 'var(--ink)', marginBottom: 14,
        }}>
          {isAdd ? 'New Supplement' : 'Edit Supplement'}
        </div>

        {/* Icon picker */}
        <label style={labelStyle}>ICON</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
          {ICONS.map(ic => (
            <button
              key={ic}
              onClick={() => setSuppForm(p => ({ ...p, icon: ic }))}
              style={{
                width: 36, height: 36, borderRadius: 8, fontSize: 18,
                border: `1.5px solid ${suppForm.icon === ic ? 'var(--ink)' : 'var(--ash3)'}`,
                background: suppForm.icon === ic ? 'var(--ink)' : 'transparent',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {ic}
            </button>
          ))}
          {/* Custom text icon */}
          <input
            placeholder="✏ custom"
            value={ICONS.includes(suppForm.icon) ? '' : suppForm.icon}
            onChange={e => setSuppForm(p => ({ ...p, icon: e.target.value }))}
            style={{ ...inputStyle, width: 80, padding: '6px 8px', fontSize: 16 }}
          />
        </div>

        {/* Name with autocomplete */}
        <label style={labelStyle}>NAME</label>
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <input
            style={inputStyle}
            value={suppForm.name}
            onChange={e => {
              const val = e.target.value
              setSuppForm(p => ({ ...p, name: val }))
              setSuppHints(searchSupplements(val))
            }}
            onBlur={() => setTimeout(() => setSuppHints([]), 150)}
            placeholder="Type to search (e.g. Creatine…)"
            autoComplete="off"
          />
          {suppHints.length > 0 && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 300,
              background: 'var(--white)',
              border: '1.5px solid var(--ink)', borderTop: 'none',
              borderRadius: '0 0 12px 12px',
              boxShadow: '0 8px 24px rgba(0,0,0,.12)',
              maxHeight: 260, overflowY: 'auto',
            }}>
              {suppHints.map((entry, i) => (
                <button
                  key={i}
                  onMouseDown={() => {
                    setSuppForm({ icon: entry.icon, name: entry.name, dose: entry.dose, desc: entry.desc, time: entry.time })
                    setSuppHints([])
                  }}
                  style={{
                    width: '100%', background: 'none',
                    border: 'none', borderBottom: '1px solid var(--linen2)',
                    padding: '10px 14px', cursor: 'pointer', textAlign: 'left',
                    display: 'flex', alignItems: 'center', gap: 10,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--linen2)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >
                  <span style={{ fontSize: 20, flexShrink: 0 }}>{entry.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{entry.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--copper)', marginTop: 1 }}>{entry.dose}</div>
                  </div>
                  <span style={{
                    fontSize: 9, fontWeight: 700, letterSpacing: .5,
                    color: 'var(--ash)', padding: '2px 7px', borderRadius: 6,
                    background: 'var(--ash3)', flexShrink: 0,
                  }}>
                    {entry.time}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Dose */}
        <label style={labelStyle}>DOSAGE</label>
        <input
          style={{ ...inputStyle, marginBottom: 12 }}
          value={suppForm.dose}
          onChange={e => setSuppForm(p => ({ ...p, dose: e.target.value }))}
          placeholder="e.g. 5g / day"
        />

        {/* Description */}
        <label style={labelStyle}>NOTES / PURPOSE</label>
        <input
          style={{ ...inputStyle, marginBottom: 12 }}
          value={suppForm.desc}
          onChange={e => setSuppForm(p => ({ ...p, desc: e.target.value }))}
          placeholder="e.g. ATP regeneration, strength & hypertrophy"
        />

        {/* Timing */}
        <label style={labelStyle}>TIMING</label>
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
          {TIMING_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setSuppForm(p => ({ ...p, time: opt.value }))}
              style={{
                padding: '6px 14px', borderRadius: 20,
                border: `1.5px solid ${suppForm.time === opt.value ? 'var(--ink)' : 'var(--ash3)'}`,
                background: suppForm.time === opt.value ? 'var(--ink)' : 'transparent',
                color: suppForm.time === opt.value ? 'var(--linen)' : 'var(--ash)',
                fontSize: 12, fontWeight: 600, cursor: 'pointer', letterSpacing: .3,
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={cancelEdit}
            style={{
              flex: 1, padding: '10px 0', borderRadius: 10,
              border: '1.5px solid var(--ash3)', background: 'transparent',
              color: 'var(--ash)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={saveSupp}
            disabled={!suppForm.name.trim()}
            style={{
              flex: 2, padding: '10px 0', borderRadius: 10,
              border: 'none', cursor: suppForm.name.trim() ? 'pointer' : 'not-allowed',
              background: suppForm.name.trim() ? 'var(--ink)' : 'var(--ash3)',
              color: suppForm.name.trim() ? 'var(--linen)' : 'var(--ash)',
              fontSize: 13, fontWeight: 600,
            }}
          >
            {isAdd ? 'Add Supplement' : 'Save Changes'}
          </button>
        </div>
      </div>
    )
  }

  // ── PEPTIDE FORM ───────────────────────────────────────────────────────
  function renderPepForm(isAdd: boolean) {
    const fields: { key: keyof Peptide; label: string; placeholder: string }[] = [
      { key: 'name',  label: 'NAME',      placeholder: 'e.g. BPC-157' },
      { key: 'cls',   label: 'CLASS',     placeholder: 'e.g. Systemic · Research compound' },
      { key: 'dose',  label: 'DOSAGE',    placeholder: 'e.g. 250–500mcg/day' },
      { key: 'route', label: 'ROUTE',     placeholder: 'e.g. SubQ / Oral' },
      { key: 'cycle', label: 'CYCLE',     placeholder: 'e.g. 4–6 weeks on/off' },
      { key: 'half',  label: 'HALF-LIFE', placeholder: 'e.g. ~4 hours' },
    ]

    return (
      <div style={{
        padding: 16, borderRadius: 14,
        background: 'var(--white)',
        border: '1.5px solid var(--ink)',
        marginBottom: 12,
      }}>
        <div style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 17, fontWeight: 600, color: 'var(--ink)', marginBottom: 14,
        }}>
          {isAdd ? 'New Peptide' : 'Edit Peptide'}
        </div>

        {fields.map(f => (
          <div key={f.key} style={{ marginBottom: 12 }}>
            <label style={labelStyle}>{f.label}</label>
            {f.key === 'name' ? (
              <div style={{ position: 'relative' }}>
                <input
                  style={inputStyle}
                  value={pepForm.name}
                  onChange={e => {
                    const val = e.target.value
                    setPepForm(p => ({ ...p, name: val }))
                    setPepHints(searchPeptides(val))
                  }}
                  onBlur={() => setTimeout(() => setPepHints([]), 150)}
                  placeholder="Type to search (e.g. BPC-157…)"
                  autoComplete="off"
                />
                {pepHints.length > 0 && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 300,
                    background: 'var(--white)',
                    border: '1.5px solid var(--ink)', borderTop: 'none',
                    borderRadius: '0 0 12px 12px',
                    boxShadow: '0 8px 24px rgba(0,0,0,.12)',
                    maxHeight: 260, overflowY: 'auto',
                  }}>
                    {pepHints.map((entry, i) => (
                      <button
                        key={i}
                        onMouseDown={() => {
                          setPepForm({ name: entry.name, cls: entry.cls, dose: entry.dose, route: entry.route, cycle: entry.cycle, half: entry.half })
                          setPepHints([])
                        }}
                        style={{
                          width: '100%', background: 'none',
                          border: 'none', borderBottom: '1px solid var(--linen2)',
                          padding: '10px 14px', cursor: 'pointer', textAlign: 'left',
                          display: 'flex', alignItems: 'flex-start', gap: 10,
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--linen2)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                      >
                        <span style={{ fontSize: 20, flexShrink: 0 }}>🔬</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{entry.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--ash)', marginTop: 1 }}>{entry.cls}</div>
                          <div style={{ fontSize: 11, color: 'var(--copper)', marginTop: 1 }}>{entry.dose} · {entry.route}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <input
                style={inputStyle}
                value={pepForm[f.key]}
                onChange={e => setPepForm(p => ({ ...p, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
              />
            )}
          </div>
        ))}

        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button
            onClick={cancelEdit}
            style={{
              flex: 1, padding: '10px 0', borderRadius: 10,
              border: '1.5px solid var(--ash3)', background: 'transparent',
              color: 'var(--ash)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={savePep}
            disabled={!pepForm.name.trim()}
            style={{
              flex: 2, padding: '10px 0', borderRadius: 10,
              border: 'none', cursor: pepForm.name.trim() ? 'pointer' : 'not-allowed',
              background: pepForm.name.trim() ? 'var(--ink)' : 'var(--ash3)',
              color: pepForm.name.trim() ? 'var(--linen)' : 'var(--ash)',
              fontSize: 13, fontWeight: 600,
            }}
          >
            {isAdd ? 'Add Peptide' : 'Save Changes'}
          </button>
        </div>
      </div>
    )
  }

  // ── SUPPLEMENTS TAB ────────────────────────────────────────────────────
  function renderSupplements() {
    const taken = today.suppsTaken
    const groups = TIMING_ORDER.map(time => ({
      time,
      label: TIMING_OPTIONS.find(t => t.value === time)!.label,
      items: supplements
        .map((s, idx) => ({ s, idx }))
        .filter(({ s }) => s.time === time),
    })).filter(g => g.items.length > 0 || g.time === (
      edit.type === 'add-supp' ? suppForm.time : ''
    ))

    const hasAny = supplements.length > 0

    return (
      <div style={{ padding: '0 20px 32px' }}>
        {/* Add supplement form at top if adding */}
        {edit.type === 'add-supp' && renderSuppForm(true)}

        {!hasAny && edit.type === 'none' && (
          <div style={{ textAlign: 'center', padding: '40px 0 24px' }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>💊</div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, color: 'var(--ink)', marginBottom: 6 }}>
              Your stack is empty
            </div>
            <div style={{ fontSize: 13, color: 'var(--ash)', lineHeight: 1.5 }}>
              Add your first supplement to start tracking your daily protocol.
            </div>
          </div>
        )}

        {TIMING_ORDER.map(time => {
          const items = supplements.map((s, idx) => ({ s, idx })).filter(({ s }) => s.time === time)
          if (items.length === 0) return null
          const label = TIMING_OPTIONS.find(t => t.value === time)!.label
          return (
            <div key={time} style={{ marginBottom: 20 }}>
              <div style={{
                fontSize: 10, fontWeight: 700, letterSpacing: 1,
                color: 'var(--ash)', marginBottom: 8,
              }}>
                {label.toUpperCase()}
              </div>
              {items.map(({ s, idx }) => {
                const isTaken = taken.includes(s.name)
                const isEditing = edit.type === 'edit-supp' && edit.idx === idx

                return (
                  <div key={idx}>
                    {isEditing ? renderSuppForm(false) : (
                      <div style={{
                        display: 'flex', alignItems: 'center',
                        padding: '11px 14px', borderRadius: 12, gap: 12,
                        background: isTaken ? 'rgba(58,122,92,.05)' : 'var(--white)',
                        border: `1.5px solid ${isTaken ? 'rgba(58,122,92,.25)' : 'var(--ash3)'}`,
                        marginBottom: 8,
                      }}>
                        <div style={{ fontSize: 22, flexShrink: 0 }}>{s.icon}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 6 }}>
                            {s.name}
                            {isTaken && <span style={{ fontSize: 10, color: 'var(--green)', fontWeight: 700 }}>✓ TAKEN</span>}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--copper)', fontWeight: 600, marginTop: 1 }}>{s.dose}</div>
                          {s.desc && (
                            <div style={{ fontSize: 11, color: 'var(--ash)', marginTop: 2, lineHeight: 1.4 }}>
                              {s.desc}
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                          <button
                            onClick={() => openEditSupp(idx)}
                            style={{
                              width: 30, height: 30, borderRadius: 8,
                              border: '1.5px solid var(--ash3)',
                              background: 'transparent', cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 13, color: 'var(--ash)',
                            }}
                          >
                            ✏
                          </button>
                          <button
                            onClick={() => deleteSupp(idx)}
                            style={{
                              width: 30, height: 30, borderRadius: 8,
                              border: '1.5px solid rgba(200,60,60,.2)',
                              background: 'rgba(200,60,60,.05)', cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 12, color: 'var(--red)',
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })}

        {edit.type !== 'add-supp' && (
          <button
            onClick={openAddSupp}
            style={{
              width: '100%', padding: '12px 0',
              borderRadius: 12, cursor: 'pointer',
              border: '1.5px dashed var(--ash3)',
              background: 'transparent',
              fontSize: 13, fontWeight: 600, color: 'var(--ash)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> Add Supplement
          </button>
        )}
      </div>
    )
  }

  // ── PEPTIDES TAB ───────────────────────────────────────────────────────
  function renderPeptides() {
    return (
      <div style={{ padding: '0 20px 32px' }}>
        <div style={{
          padding: '10px 14px', borderRadius: 10, marginBottom: 16,
          background: 'rgba(200,140,0,.06)', border: '1px solid rgba(200,140,0,.2)',
          fontSize: 11, color: 'var(--ash)', lineHeight: 1.5,
        }}>
          ⚠️ Research compounds only. Consult a licensed physician before use. Not FDA-approved.
        </div>

        {edit.type === 'add-pep' && renderPepForm(true)}

        {peptides.length === 0 && edit.type === 'none' && (
          <div style={{ textAlign: 'center', padding: '40px 0 24px' }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>🔬</div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, color: 'var(--ink)', marginBottom: 6 }}>
              No peptides logged
            </div>
            <div style={{ fontSize: 13, color: 'var(--ash)', lineHeight: 1.5 }}>
              Add your research peptide protocols here.
            </div>
          </div>
        )}

        {peptides.map((p, idx) => {
          const isEditing = edit.type === 'edit-pep' && edit.idx === idx
          if (isEditing) return <div key={idx}>{renderPepForm(false)}</div>

          return (
            <div key={idx} style={{
              borderRadius: 14,
              border: '1.5px solid var(--ash3)',
              background: 'var(--white)',
              marginBottom: 12, overflow: 'hidden',
            }}>
              <div style={{
                padding: '13px 16px 10px',
                display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10,
              }}>
                <div>
                  <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 19, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.2 }}>
                    {p.name}
                  </div>
                  {p.cls && (
                    <div style={{ fontSize: 11, color: 'var(--ash)', marginTop: 2 }}>{p.cls}</div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button
                    onClick={() => openEditPep(idx)}
                    style={{
                      width: 30, height: 30, borderRadius: 8,
                      border: '1.5px solid var(--ash3)',
                      background: 'transparent', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, color: 'var(--ash)',
                    }}
                  >
                    ✏
                  </button>
                  <button
                    onClick={() => deletePep(idx)}
                    style={{
                      width: 30, height: 30, borderRadius: 8,
                      border: '1.5px solid rgba(200,60,60,.2)',
                      background: 'rgba(200,60,60,.05)', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, color: 'var(--red)',
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr',
                gap: 1, borderTop: '1px solid var(--ash3)',
              }}>
                {[
                  { label: 'Dose',      value: p.dose  },
                  { label: 'Route',     value: p.route },
                  { label: 'Cycle',     value: p.cycle },
                  { label: 'Half-life', value: p.half  },
                ].map((stat, i) => stat.value ? (
                  <div key={i} style={{
                    padding: '9px 14px',
                    borderRight: i % 2 === 0 ? '1px solid var(--ash3)' : 'none',
                  }}>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: .7, color: 'var(--ash)', marginBottom: 2 }}>
                      {stat.label.toUpperCase()}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 600 }}>{stat.value}</div>
                  </div>
                ) : null)}
              </div>
            </div>
          )
        })}

        {edit.type !== 'add-pep' && (
          <button
            onClick={openAddPep}
            style={{
              width: '100%', padding: '12px 0',
              borderRadius: 12, cursor: 'pointer',
              border: '1.5px dashed var(--ash3)',
              background: 'transparent',
              fontSize: 13, fontWeight: 600, color: 'var(--ash)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> Add Peptide
          </button>
        )}
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
        {/* Header */}
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
              Manage Stack
            </div>
            <button
              onClick={onClose}
              style={{
                width: 32, height: 32, borderRadius: '50%',
                border: 'none', cursor: 'pointer',
                background: 'var(--ash3)', color: 'var(--ink)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16,
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
            {(['supplements', 'peptides'] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => { setTab(t); setEdit({ type: 'none' }) }}
                style={{
                  flex: 1, padding: '8px 0',
                  borderRadius: 9, border: 'none', cursor: 'pointer',
                  background: tab === t ? 'var(--white)' : 'transparent',
                  boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,.08)' : 'none',
                  fontSize: 13, fontWeight: 600,
                  color: tab === t ? 'var(--ink)' : 'var(--ash)',
                  letterSpacing: .3,
                }}
              >
                {t === 'supplements' ? `Supplements${supplements.length ? ` (${supplements.length})` : ''}` : 'Peptides'}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable content */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {tab === 'supplements' ? renderSupplements() : renderPeptides()}
        </div>
      </div>
    </div>
  )
}
