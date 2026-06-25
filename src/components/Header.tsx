import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { Building2, FileText, MessageSquareText, LogOut, UserCircle2, LayoutDashboard, Shield } from 'lucide-react'
import type { User } from '@supabase/supabase-js'

type ViewType = 'landing' | 'auth' | 'portal' | 'result' | 'admin-dashboard' | 'user-dashboard' | 'chat' | 'escalation-report'

interface HeaderProps {
  currentView: ViewType
  onNavigate: (view: ViewType) => void
  user: User | null
  onLogout: () => void
}

const NAV = [
  { view: 'portal'         as ViewType, label: 'Portal',    Icon: FileText },
  { view: 'user-dashboard' as ViewType, label: 'My Cases',  Icon: LayoutDashboard },
  { view: 'chat'           as ViewType, label: 'Help Desk', Icon: MessageSquareText },
  { view: 'admin-dashboard'as ViewType, label: 'Admin',     Icon: Shield },
]

const Header = ({ currentView, onNavigate, user, onLogout }: HeaderProps) => {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    gsap.fromTo(ref.current,
      { y: -40, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.55, ease: 'power3.out' })
  }, [])

  const isActive = (v: ViewType) =>
    v === currentView || (v === 'user-dashboard' && currentView === 'result')

  return (
    <header
      ref={ref}
      className="sticky top-0 z-50"
      style={{
        background: 'rgba(242,237,230,0.88)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(0,0,0,0.07)',
      }}
    >
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6 md:px-10">

        {/* Logo */}
        <div className="flex cursor-pointer items-center gap-3" onClick={() => onNavigate('portal')}>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg"
            style={{ background: '#1A1A1A' }}>
            <Building2 size={13} color="#F2EDE6" />
          </div>
          <span className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: '#1A1A1A' }}>
            CivicMind
          </span>
          <span className="hidden h-4 w-px sm:block" style={{ background: 'rgba(0,0,0,0.15)' }} />
          <span className="hidden text-[10px] font-medium sm:block" style={{ color: '#888' }}>
            Bhopal Municipal Corp.
          </span>
        </div>

        {/* Nav */}
        <nav className="hidden items-center gap-1 rounded-full p-1 sm:flex"
          style={{ background: 'rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.06)' }}>
          {NAV.map(({ view, label, Icon }) => (
            <button
              key={view}
              onClick={() => onNavigate(view)}
              className="flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest transition-all duration-200"
              style={isActive(view)
                ? { background: '#1A1A1A', color: '#F2EDE6' }
                : { color: '#888' }}
            >
              <Icon size={11} />
              {label}
            </button>
          ))}
        </nav>

        {/* Right */}
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <div className="hidden items-center gap-2 rounded-full border px-3 py-1 sm:flex"
                style={{ borderColor: 'rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.5)' }}>
                <UserCircle2 size={12} style={{ color: '#888' }} />
                <span className="max-w-[130px] truncate text-[11px] font-medium" style={{ color: '#555' }}>
                  {user.user_metadata?.full_name || user.email}
                </span>
              </div>
              <button
                onClick={onLogout}
                className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wider transition-all"
                style={{ borderColor: 'rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.5)', color: '#888' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#B91C1C'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(185,28,28,0.25)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#888'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,0,0,0.1)' }}
              >
                <LogOut size={11} />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </>
          ) : (
            <span className="rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wider"
              style={{ borderColor: 'rgba(0,0,0,0.1)', color: '#888' }}>
              Public Portal
            </span>
          )}
        </div>
      </div>

      {/* Mobile nav */}
      <div className="flex items-center gap-1 overflow-x-auto px-4 pb-2 sm:hidden">
        {NAV.map(({ view, label, Icon }) => (
          <button key={view} onClick={() => onNavigate(view)}
            className="flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest"
            style={isActive(view) ? { background: '#1A1A1A', color: '#F2EDE6' } : { color: '#888' }}>
            <Icon size={10} />{label}
          </button>
        ))}
      </div>
    </header>
  )
}

export default Header
