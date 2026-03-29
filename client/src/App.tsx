import { useEffect, useState } from 'react'
import { AppProvider, useApp } from './context/AppContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import { supabase } from './lib/supabase'
import { Page } from './types'
import { useToast } from './hooks/useToast'
import StatusBar from './components/StatusBar'
import BottomNav from './components/BottomNav'
import LoginScreen from './components/LoginScreen'
import Onboarding from './components/Onboarding'
import ProfileModal from './components/modals/ProfileModal'
import FoodModal from './components/modals/FoodModal'
import MetricsModal from './components/modals/MetricsModal'
import SplitModal from './components/modals/SplitModal'
import StackManagerModal from './components/modals/StackManagerModal'
import Home from './pages/Home'
import Train from './pages/Train'
import AICoach from './pages/AICoach'
import Recovery from './pages/Recovery'
import Nutrition from './pages/Nutrition'
import Supplements from './pages/Supplements'

const Splash = () => (
  <div style={{
    position: 'fixed', inset: 0, background: '#1A1714',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    fontSize: 42, fontWeight: 300, letterSpacing: 10, color: '#F5F0E8',
  }}>
    APEX
  </div>
)

function AppInner() {
  const { state, reload } = useApp()
  const { user, loading: authLoading } = useAuth()
  const [onboarded, setOnboarded] = useState<boolean | null>(null)
  const [page, setPage] = useState<Page>('home')
  const [profileOpen,  setProfileOpen]  = useState(false)
  const [foodOpen,     setFoodOpen]     = useState(false)
  const [metricsOpen,  setMetricsOpen]  = useState(false)
  const [splitOpen,    setSplitOpen]    = useState(false)
  const [stackOpen,    setStackOpen]    = useState(false)
  const { message, visible, showToast } = useToast()

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', state.darkMode ? 'dark' : 'light')
  }, [state.darkMode])

  useEffect(() => {
    if (!user) { setOnboarded(null); return }
    supabase.from('profiles').select('onboarded').eq('id', user.id).single()
      .then(({ data, error }) => {
        if (error) setOnboarded(false)
        else setOnboarded(data?.onboarded ?? false)
      })
  }, [user?.id])

  if (authLoading || (user && onboarded === null)) return <Splash />
  if (!user) return <LoginScreen />
  if (!onboarded) return (
    <Onboarding userId={user.id} onComplete={async () => {
      await reload()
      setOnboarded(true)
    }} />
  )

  const isAI = page === 'ai'

  return (
    <div className="phone-frame">
      <StatusBar />

      {isAI ? (
        <AICoach />
      ) : (
        <div className="scroll-area">
          {page === 'home' && (
            <Home
              onNav={p => setPage(p)}
              onProfile={() => setProfileOpen(true)}
              showToast={showToast}
              onLogMetrics={() => setMetricsOpen(true)}
            />
          )}
          {page === 'train' && (
            <Train onNav={p => setPage(p)} showToast={showToast} onEditSplit={() => setSplitOpen(true)} />
          )}
          {page === 'recovery' && (
            <Recovery showToast={showToast} onLogMetrics={() => setMetricsOpen(true)} />
          )}
          {page === 'nutrition' && (
            <Nutrition onAddMeal={() => setFoodOpen(true)} showToast={showToast} />
          )}
          {page === 'supp' && (
            <Supplements showToast={showToast} onManageStack={() => setStackOpen(true)} />
          )}
        </div>
      )}

      <BottomNav current={page} onNav={p => setPage(p)} />

      <ProfileModal open={profileOpen}  onClose={() => setProfileOpen(false)}  showToast={showToast} />
      <FoodModal    open={foodOpen}     onClose={() => setFoodOpen(false)}     showToast={showToast} />
      <MetricsModal open={metricsOpen}  onClose={() => setMetricsOpen(false)}  showToast={showToast} />
      <SplitModal        open={splitOpen}  onClose={() => setSplitOpen(false)}  showToast={showToast} />
      <StackManagerModal open={stackOpen}  onClose={() => setStackOpen(false)}  showToast={showToast} />

      <div className={`toast${visible ? ' show' : ''}`}>{message}</div>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <AppInner />
      </AppProvider>
    </AuthProvider>
  )
}
