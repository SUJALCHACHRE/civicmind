import { useState, useRef, useEffect } from 'react'
import gsap from 'gsap'
import Header from '@/components/Header'
import LandingPage from '@/components/LandingPage'
import AuthPage from '@/components/AuthPage'
import ComplaintForm from '@/components/ComplaintForm'
import ResultView from '@/components/ResultView'
import Dashboard from '@/components/Dashboard'
import UserDashboard from '@/components/UserDashboard'
import ChatBot from '@/components/ChatBot'
import EscalationReport from '@/components/EscalationReport'
import CivicBackdrop from '@/components/CivicBackdrop'
import { Toaster, toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Complaint } from '@/types'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

type ViewType = 'landing' | 'auth' | 'portal' | 'result' | 'admin-dashboard' | 'user-dashboard' | 'chat' | 'escalation-report'

// Views that show the main header (not landing/auth)
const APP_VIEWS: ViewType[] = ['portal', 'result', 'admin-dashboard', 'user-dashboard', 'chat', 'escalation-report']

function App() {
  const [currentView, setCurrentView] = useState<ViewType>('landing')
  const [lastComplaint, setLastComplaint] = useState<Complaint | null>(null)
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false)
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')
  const [escalationComplaint, setEscalationComplaint] = useState<Complaint | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const contentRef = useRef<HTMLDivElement>(null)

  // ── Auth listener ──────────────────────────────────────────────
  useEffect(() => {
    let isMounted = true
    const safetyTimer = window.setTimeout(() => {
      if (isMounted) setAuthLoading(false)
    }, 3500)

    supabase.auth.getUser()
      .then(({ data }) => {
        if (!isMounted) return
        const u = data.user
        setUser(u)
        // If already logged in, skip landing/auth
        if (u) setCurrentView('portal')
      })
      .catch(() => { if (isMounted) setUser(null) })
      .finally(() => {
        if (!isMounted) return
        window.clearTimeout(safetyTimer)
        setAuthLoading(false)
      })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return
      setUser(session?.user ?? null)
      setAuthLoading(false)
    })

    return () => {
      isMounted = false
      window.clearTimeout(safetyTimer)
      listener.subscription.unsubscribe()
    }
  }, [])

  const navigateToView = (view: ViewType) => {
    if (contentRef.current) {
      gsap.to(contentRef.current, {
        opacity: 0, y: -10, duration: 0.2, ease: 'power2.in',
        onComplete: () => {
          setCurrentView(view)
          gsap.fromTo(contentRef.current!, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' })
        },
      })
    } else {
      setCurrentView(view)
    }
  }

  const handleComplaintSuccess = (complaint: Complaint) => {
    setLastComplaint(complaint)
    navigateToView('result')
  }

  const handleNavigate = (view: ViewType) => {
    if (view === 'admin-dashboard' && !isAdminAuthenticated) {
      setShowPasswordPrompt(true)
      return
    }
    navigateToView(view)
  }

  const handlePasswordSubmit = () => {
    if (passwordInput === '001001') {
      setIsAdminAuthenticated(true)
      setShowPasswordPrompt(false)
      setPasswordInput('')
      navigateToView('admin-dashboard')
    } else {
      toast.error('Invalid admin password')
    }
  }

  const handleEscalate = (complaint: Complaint) => {
    setEscalationComplaint(complaint)
    navigateToView('escalation-report')
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    navigateToView('landing')
    toast.success('Signed out successfully')
  }

  const handleAuthSuccess = () => {
    navigateToView('portal')
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: '#F2EDE6' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="spinner" />
          <p className="section-label">Loading CivicMind…</p>
        </div>
      </div>
    )
  }

  const showAppHeader = APP_VIEWS.includes(currentView)

  return (
    <div className="relative min-h-screen grain" style={{ background: '#F2EDE6' }}>

      {showAppHeader && (
        <Header
          currentView={currentView as any}
          onNavigate={handleNavigate as any}
          user={user}
          onLogout={handleLogout}
        />
      )}

      <div ref={contentRef} className="relative z-10">
        {/* ── Landing Page ── */}
        {currentView === 'landing' && (
          <LandingPage onGetStarted={() => navigateToView('auth')} />
        )}

        {/* ── Auth Page ── */}
        {currentView === 'auth' && (
          <div style={{ background: '#F2EDE6', minHeight: '100vh' }}>
            <AuthPage onAuthSuccess={handleAuthSuccess} />
          </div>
        )}

        {/* ── Portal: complaint form ── */}
        {currentView === 'portal' && (
          user
            ? <ComplaintForm onSuccess={handleComplaintSuccess} userEmail={user.email || ''} />
            : <AuthPage onAuthSuccess={handleAuthSuccess} />
        )}

        {currentView === 'result' && lastComplaint && (
          <ResultView
            complaint={lastComplaint}
            onNewComplaint={() => navigateToView('portal')}
            onDashboard={() => navigateToView('user-dashboard')}
          />
        )}

        {currentView === 'admin-dashboard' && isAdminAuthenticated && (
          <Dashboard isAdmin={true} onEscalate={handleEscalate} />
        )}

        {currentView === 'user-dashboard' && user && (
          <UserDashboard
            user={user}
            onEscalate={handleEscalate}
            onNewComplaint={() => navigateToView('portal')}
          />
        )}

        {currentView === 'chat' && <ChatBot user={user} />}

        {currentView === 'escalation-report' && escalationComplaint && (
          <EscalationReport
            complaint={escalationComplaint}
            onClose={() => navigateToView('user-dashboard')}
          />
        )}
      </div>

      {/* ── Admin Password Modal ── */}
      {showPasswordPrompt && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm overflow-hidden rounded-2xl p-8 shadow-2xl" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.09)' }}>
            <h3 className="mb-2 text-lg font-black" style={{ color: '#1A1A1A' }}>Admin Access</h3>
            <p className="mb-6 text-xs" style={{ color: '#888' }}>Enter the security code to access management features.</p>
            <input type="password" autoFocus placeholder="Enter password" value={passwordInput}
              onChange={e => setPasswordInput(e.target.value)}
              className="input-cream mb-4 text-center text-lg tracking-[0.5em]"
              onKeyDown={e => e.key === 'Enter' && handlePasswordSubmit()} />
            <div className="flex gap-3">
              <button className="btn-outline-ink flex-1 py-2.5" onClick={() => setShowPasswordPrompt(false)}>Cancel</button>
              <button className="btn-ink flex-1 py-2.5" onClick={handlePasswordSubmit}>Unlock</button>
            </div>
          </div>
        </div>
      )}

      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#fff',
            border: '1px solid rgba(0,0,0,0.09)',
            color: '#1A1A1A',
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: '13px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
          },
        }}
      />
    </div>
  )
}

export default App
