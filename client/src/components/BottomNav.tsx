import { Page } from '../types'

interface Props {
  current: Page
  onNav: (p: Page) => void
}

function HomeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9L12 3l9 6v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/>
      <path d="M9 22V12h6v10"/>
    </svg>
  )
}

function TrainIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="9" width="4" height="6" rx="1.5"/>
      <rect x="9" y="6" width="4" height="12" rx="1.5"/>
      <rect x="16" y="9" width="4" height="6" rx="1.5"/>
      <line x1="6" y1="12" x2="9" y2="12"/>
      <line x1="13" y1="12" x2="16" y2="12"/>
    </svg>
  )
}

function RecoveryIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  )
}

function NutritionIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8h1a4 4 0 0 1 0 8h-1"/>
      <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/>
      <line x1="6" y1="1" x2="6" y2="4"/>
      <line x1="10" y1="1" x2="10" y2="4"/>
      <line x1="14" y1="1" x2="14" y2="4"/>
    </svg>
  )
}

function StackIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7z"/>
      <line x1="8.5" y1="8.5" x2="15.5" y2="15.5"/>
    </svg>
  )
}

function AiIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l1.5 6.5L20 7l-5 4.5 2 6.5-5-3.5-5 3.5 2-6.5L4 7l6.5 1.5z"/>
    </svg>
  )
}

const LEFT_ITEMS = [
  { page: 'home' as Page,  Icon: HomeIcon,     label: 'Home'      },
  { page: 'train' as Page, Icon: TrainIcon,    label: 'Train'     },
]
const RIGHT_ITEMS = [
  { page: 'recovery' as Page,  Icon: RecoveryIcon,  label: 'Recovery'  },
  { page: 'nutrition' as Page, Icon: NutritionIcon, label: 'Nutrition' },
  { page: 'supp' as Page,      Icon: StackIcon,     label: 'Stack'     },
]

export default function BottomNav({ current, onNav }: Props) {
  return (
    <div className="bottom-nav">
      {LEFT_ITEMS.map(({ page, Icon, label }) => (
        <button
          key={page}
          className={`nav-item${current === page ? ' active' : ''}`}
          onClick={() => onNav(page)}
        >
          <div className="nav-icon"><Icon /></div>
          <div className="nav-label">{label}</div>
        </button>
      ))}

      <button
        className={`nav-item nav-ai${current === 'ai' ? ' active' : ''}`}
        onClick={() => onNav('ai')}
      >
        <div className="nav-icon nav-ai-icon"><AiIcon /></div>
        <div className="nav-label">AI</div>
      </button>

      {RIGHT_ITEMS.map(({ page, Icon, label }) => (
        <button
          key={page}
          className={`nav-item${current === page ? ' active' : ''}`}
          onClick={() => onNav(page)}
        >
          <div className="nav-icon"><Icon /></div>
          <div className="nav-label">{label}</div>
        </button>
      ))}
    </div>
  )
}
