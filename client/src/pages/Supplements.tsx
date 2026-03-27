import { useApp } from '../context/AppContext'

interface Props {
  showToast: (msg: string) => void
  onManageStack: () => void
}

export default function Supplements({ showToast, onManageStack }: Props) {
  const { state, setState } = useApp()
  const { supplements, peptides, today } = state

  const toggleSupp = (name: string) => {
    setState(prev => {
      const taken = prev.today.suppsTaken
      const next = taken.includes(name) ? taken.filter(s => s !== name) : [...taken, name]
      if (!taken.includes(name)) showToast(`${name} logged ✓`)
      return { ...prev, today: { ...prev.today, suppsTaken: next } }
    })
  }

  const morning = supplements.filter(s => s.time === 'morning')
  const preworkout = supplements.filter(s => s.time === 'preworkout')
  const night = supplements.filter(s => s.time === 'night')

  const takenCount = today.suppsTaken.length
  const totalCount = supplements.length

  return (
    <div className="page active">
      <div style={{ padding: '20px 24px 16px' }}>
        <div className="eyebrow">Evidence-Based Stack</div>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 34, fontWeight: 300, lineHeight: 1.1 }}>
          Your stack,<br /><em style={{ color: 'var(--copper)' }}>optimised.</em>
        </div>
        <div style={{ marginTop: 10, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <span className="pill pill-green">{takenCount}/{totalCount} taken today</span>
          {takenCount === totalCount && totalCount > 0 && <span className="pill pill-copper">All done ✓</span>}
          <button
            onClick={onManageStack}
            style={{
              background: 'var(--ink)', border: 'none', cursor: 'pointer',
              color: 'var(--linen)', fontSize: 11, fontWeight: 700,
              letterSpacing: .6, padding: '5px 12px', borderRadius: 20,
              display: 'flex', alignItems: 'center', gap: 5, marginLeft: 'auto',
            }}
          >
            ✦ Manage Stack
          </button>
        </div>
      </div>

      {[
        { label: 'Morning', items: morning },
        { label: 'Pre-Workout', items: preworkout },
        { label: 'Night', items: night },
      ].map(group => group.items.length > 0 && (
        <div key={group.label} style={{ marginBottom: 8 }}>
          <div style={{ padding: '0 24px 8px' }}>
            <div className="eyebrow" style={{ margin: 0 }}>{group.label}</div>
          </div>
          <div className="supp-grid">
            {group.items.map(s => {
              const taken = today.suppsTaken.includes(s.name)
              return (
                <div
                  key={s.name}
                  className={`supp-tile${taken ? ' taken' : ''}`}
                  onClick={() => toggleSupp(s.name)}
                >
                  <div className="supp-icon">{s.icon}</div>
                  <div className="supp-name">{s.name}</div>
                  <div className="supp-dose">{s.dose}</div>
                  <div className="supp-desc">{s.desc}</div>
                  {taken && (
                    <div className="supp-check">✓</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}

      <div style={{ padding: '0 24px 10px' }}>
        <div className="eyebrow">Research Peptides</div>
        <div className="warn-banner" style={{ margin: 0, marginBottom: 12 }}>
          ⚠️ Research use only. Consult a licensed physician before use. Not FDA approved for human administration.
        </div>
      </div>

      {peptides.map(p => (
        <div key={p.name} className="peptide-card">
          <div className="pc-name">{p.name}</div>
          <div className="pc-class">{p.cls}</div>
          <div className="pc-stats">
            <div>
              <div className="pc-sl">Dose</div>
              <div className="pc-sv">{p.dose}</div>
            </div>
            <div>
              <div className="pc-sl">Route</div>
              <div className="pc-sv">{p.route}</div>
            </div>
            <div>
              <div className="pc-sl">Cycle</div>
              <div className="pc-sv">{p.cycle}</div>
            </div>
            <div>
              <div className="pc-sl">Half-life</div>
              <div className="pc-sv">{p.half}</div>
            </div>
          </div>
        </div>
      ))}

      <div className="bottom-spacer" />
    </div>
  )
}
