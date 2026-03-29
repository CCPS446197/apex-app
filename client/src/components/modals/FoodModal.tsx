import { useState, useRef, useEffect } from 'react'
import { apiFetch } from '../../lib/api'
import { useApp } from '../../context/AppContext'
import { Meal } from '../../types'

interface Props {
  open: boolean
  onClose: () => void
  showToast: (msg: string) => void
}

type Tab = 'scan' | 'manual' | 'search'
type ScanPhase = 'idle' | 'scanning' | 'result'

interface ScanResult {
  name: string
  items: Array<{ name: string; portion: string; kcal: number; p: number; c: number; f: number; confidence: string }>
  totals: { kcal: number; p: number; c: number; f: number }
}

const FOOD_DB: Meal[] = [
  { name: 'Chicken Breast (100g)', icon: '🍗', items: '100g grilled chicken', kcal: 165, p: 31, c: 0, f: 3.6 },
  { name: 'Brown Rice (100g)', icon: '🍚', items: '100g cooked brown rice', kcal: 111, p: 2.6, c: 23, f: 0.9 },
  { name: 'Eggs (2 large)', icon: '🥚', items: '2 large eggs', kcal: 143, p: 13, c: 0.7, f: 10 },
  { name: 'Oats (80g)', icon: '🥣', items: '80g dry oats', kcal: 296, p: 10, c: 53, f: 5 },
  { name: 'Broccoli (150g)', icon: '🥦', items: '150g steamed broccoli', kcal: 51, p: 4, c: 10, f: 0.6 },
  { name: 'Greek Yogurt (200g)', icon: '🥛', items: '200g full-fat Greek yogurt', kcal: 190, p: 18, c: 5, f: 10 },
  { name: 'Banana (medium)', icon: '🍌', items: '1 medium banana 120g', kcal: 107, p: 1.3, c: 27, f: 0.4 },
  { name: 'Salmon (150g)', icon: '🐟', items: '150g Atlantic salmon', kcal: 280, p: 39, c: 0, f: 13 },
  { name: 'Almonds (30g)', icon: '🥜', items: '30g raw almonds', kcal: 173, p: 6, c: 6, f: 15 },
  { name: 'Whole Milk (250ml)', icon: '🥛', items: '250ml whole milk', kcal: 149, p: 8, c: 11.5, f: 8 },
]

/** Resize + JPEG-compress a data URL to ~150–300 KB before upload.
 *  Phone photos can be 6–15 MB; Claude Vision only needs ~1024 px. */
function compressImage(dataUrl: string, maxDim = 1024, quality = 0.82): Promise<string> {
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => {
      const scale   = Math.min(1, maxDim / Math.max(img.width, img.height))
      const canvas  = document.createElement('canvas')
      canvas.width  = Math.round(img.width  * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.src = dataUrl
  })
}

export default function FoodModal({ open, onClose, showToast }: Props) {
  const { setState } = useApp()
  const [tab, setTab] = useState<Tab>('scan')
  const [scanPhase, setScanPhase] = useState<ScanPhase>('idle')
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [scanLoading, setScanLoading] = useState(false)
  const [searchQ, setSearchQ] = useState('')
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const fileRef    = useRef<HTMLInputElement>(null)
  const abortRef   = useRef<AbortController | null>(null)

  // Cancel any in-flight scan when the modal closes
  useEffect(() => {
    if (!open) {
      abortRef.current?.abort()
      abortRef.current = null
    }
  }, [open])

  // Manual form
  const [mName, setMName] = useState('')
  const [mKcal, setMKcal] = useState('')
  const [mP, setMP] = useState('')
  const [mC, setMC] = useState('')
  const [mF, setMF] = useState('')

  function addMeal(meal: Meal) {
    setState(prev => ({
      ...prev,
      today: { ...prev.today, meals: [...prev.today.meals, meal] },
    }))
    showToast(`${meal.name} added ✓`)
    onClose()
  }

  function addManual() {
    if (!mName.trim() || !mKcal) return
    addMeal({
      name: mName.trim(),
      icon: '🍽️',
      items: `${mP || 0}g protein · ${mC || 0}g carbs · ${mF || 0}g fat`,
      kcal: parseInt(mKcal) || 0,
      p: parseInt(mP) || 0,
      c: parseInt(mC) || 0,
      f: parseInt(mF) || 0,
    })
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async ev => {
      const dataUrl = ev.target?.result as string
      setCapturedImage(dataUrl)
      // Compress before upload: reduces typical 6–15 MB phone photo to ~150–300 KB
      const compressed = await compressImage(dataUrl)
      scanImage(compressed)
    }
    reader.readAsDataURL(file)
  }

  async function scanImage(dataUrl: string) {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setScanPhase('scanning')
    setScanLoading(true)
    try {
      const res = await apiFetch('/api/scan', {
        method: 'POST',
        body: JSON.stringify({ image: dataUrl }),
        signal: controller.signal,
      })
      if (!res.ok) throw new Error('Scan failed')
      const data = await res.json()
      setScanResult(data)
      setScanPhase('result')
    } catch (err) {
      if ((err as Error).name === 'AbortError') return  // user closed modal or retried
      showToast('Scan failed — try manual entry')
      setScanPhase('idle')
      setCapturedImage(null)
    } finally {
      setScanLoading(false)
    }
  }

  function addScanResult() {
    if (!scanResult) return
    addMeal({
      name: scanResult.name || 'Scanned Meal',
      icon: '📸',
      items: scanResult.items.map(i => i.name).join(' · '),
      kcal: scanResult.totals.kcal,
      p: scanResult.totals.p,
      c: scanResult.totals.c,
      f: scanResult.totals.f,
    })
  }

  function resetScan() {
    abortRef.current?.abort()
    abortRef.current = null
    setScanPhase('idle')
    setCapturedImage(null)
    setScanResult(null)
  }

  const filtered = FOOD_DB.filter(f =>
    !searchQ || f.name.toLowerCase().includes(searchQ.toLowerCase())
  )

  return (
    <div className={`modal-overlay${open ? ' open' : ''}`} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-sheet" style={{ maxHeight: '88%' }}>
        <div className="modal-handle" />
        <div className="modal-header">
          <div className="modal-title">Add Food</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--ash3)', padding: '0 20px' }}>
          {(['scan', 'search', 'manual'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1, padding: '10px 4px', border: 'none', background: 'transparent',
                fontFamily: "'Instrument Sans', sans-serif",
                fontWeight: 600, fontSize: 12,
                color: tab === t ? 'var(--ink)' : 'var(--ash)',
                borderBottom: tab === t ? '2px solid var(--ink)' : '2px solid transparent',
                cursor: 'pointer', letterSpacing: .3,
              }}
            >
              {t === 'scan' ? '📷 Scan' : t === 'search' ? '🔍 Search' : '✏️ Manual'}
            </button>
          ))}
        </div>

        <div className="modal-body" style={{ padding: 16 }}>
          {/* ─── SCAN TAB ─── */}
          {tab === 'scan' && (
            <>
              {scanPhase === 'idle' && (
                <>
                  <div className="scan-preview-area">
                    <div className="scan-empty-state">
                      <div className="scan-icon-ring">
                        <span style={{ fontSize: 28 }}>📷</span>
                      </div>
                      <div className="scan-empty-title">AI Food Scanner</div>
                      <div className="scan-empty-sub">
                        Take a photo of your meal and Claude will identify every ingredient with precise macros
                      </div>
                    </div>
                  </div>
                  <div className="scan-btn-row">
                    <button className="scan-action-btn" onClick={() => fileRef.current?.click()}>
                      <span style={{ fontSize: 22 }}>📸</span>
                      Camera / Photo
                    </button>
                  </div>
                  <div className="scan-source-note">
                    Powered by Claude claude-opus-4-5 vision · Accuracy ≥ 85% for whole foods
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleFileSelect} />
                </>
              )}

              {scanPhase === 'scanning' && (
                <div className="scan-preview-area">
                  {capturedImage && <img src={capturedImage} className="scan-preview-img" alt="Scanning" />}
                  <div className="scan-overlay">
                    <div className="scan-corner tl" /><div className="scan-corner tr" />
                    <div className="scan-corner bl" /><div className="scan-corner br" />
                    <div className="scan-line" />
                    <div className="scan-status-chip">
                      <div className="scan-pulse-dot" />
                      Analysing with Claude…
                    </div>
                  </div>
                </div>
              )}

              {scanPhase === 'result' && scanResult && (
                <>
                  {capturedImage && (
                    <div className="scan-result-img-wrap">
                      <img src={capturedImage} className="scan-result-img" alt="Meal" />
                      <div className="scan-confidence-badge">
                        <span style={{ color: 'var(--green)' }}>✓ Identified</span>
                      </div>
                    </div>
                  )}
                  <div className="scan-totals-card">
                    <div className="scan-totals-top">
                      <div className="scan-totals-kcal">{scanResult.totals.kcal}</div>
                      <div className="scan-totals-label">calories</div>
                    </div>
                    <div className="scan-macro-row">
                      {[
                        { label: 'Protein', val: `${scanResult.totals.p}g` },
                        { label: 'Carbs', val: `${scanResult.totals.c}g` },
                        { label: 'Fat', val: `${scanResult.totals.f}g` },
                      ].map(m => (
                        <div key={m.label} className="scan-macro-pill">
                          <div className="scan-macro-val">{m.val}</div>
                          <div className="scan-macro-lbl">{m.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {scanResult.items.length > 0 && (
                    <div className="scan-items-list">
                      {scanResult.items.map((item, i) => (
                        <div key={i} className="scan-food-item">
                          <div className="scan-food-icon">🍽️</div>
                          <div className="scan-food-info">
                            <div className="scan-food-name">{item.name}</div>
                            <div className="scan-food-portion">{item.portion}</div>
                          </div>
                          <div className="scan-food-right">
                            <div className="scan-food-kcal">{item.kcal} kcal</div>
                            <div className="scan-food-conf">{item.confidence}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="scan-action-row">
                    <button className="btn-ghost" style={{ flex: 1 }} onClick={resetScan}>Retry</button>
                    <button className="btn-primary" style={{ flex: 2 }} onClick={addScanResult}>Add to Log</button>
                  </div>
                  <div className="scan-source-note">
                    Analysis by Claude claude-opus-4-5 · Estimates based on visual portion analysis
                  </div>
                </>
              )}
            </>
          )}

          {/* ─── SEARCH TAB ─── */}
          {tab === 'search' && (
            <>
              <input
                className="inp"
                placeholder="Search foods…"
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                style={{ marginBottom: 12 }}
              />
              {filtered.map(f => (
                <div key={f.name} className="food-result" onClick={() => addMeal(f)}>
                  <div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span>{f.icon}</span>
                      <div>
                        <div className="food-result-name">{f.name}</div>
                        <div className="food-result-macro">P{f.p}g · C{f.c}g · F{f.f}g</div>
                      </div>
                    </div>
                  </div>
                  <div className="food-result-kcal">{f.kcal}</div>
                </div>
              ))}
              {filtered.length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--ash)', padding: '30px 0', fontSize: 13 }}>
                  No results — try manual entry
                </div>
              )}
            </>
          )}

          {/* ─── MANUAL TAB ─── */}
          {tab === 'manual' && (
            <>
              <div className="inp-group">
                <div className="inp-label">Meal Name</div>
                <input className="inp" value={mName} onChange={e => setMName(e.target.value)} placeholder="e.g. Chicken & Rice" />
              </div>
              <div className="inp-group">
                <div className="inp-label">Calories (kcal)</div>
                <input className="inp" type="number" value={mKcal} onChange={e => setMKcal(e.target.value)} inputMode="numeric" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                <div className="inp-group">
                  <div className="inp-label">Protein (g)</div>
                  <input className="inp" type="number" value={mP} onChange={e => setMP(e.target.value)} inputMode="numeric" />
                </div>
                <div className="inp-group">
                  <div className="inp-label">Carbs (g)</div>
                  <input className="inp" type="number" value={mC} onChange={e => setMC(e.target.value)} inputMode="numeric" />
                </div>
                <div className="inp-group">
                  <div className="inp-label">Fat (g)</div>
                  <input className="inp" type="number" value={mF} onChange={e => setMF(e.target.value)} inputMode="numeric" />
                </div>
              </div>
              <button
                className="btn-primary"
                onClick={addManual}
                disabled={!mName.trim() || !mKcal}
                style={{ marginTop: 8, opacity: !mName.trim() || !mKcal ? .5 : 1 }}
              >
                Add Meal
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
