import { useState, useEffect, useRef } from 'react'
import gsap from 'gsap'
import { Mail, Lock, User, Eye, EyeOff, ArrowRight, ShieldCheck, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

interface AuthPageProps { onAuthSuccess: () => void }

const FEATURES = [
  'Real-time AI complaint classification',
  'Automated department routing',
  'Priority SLA enforcement',
  'Ward-level tracking & dashboards',
]

const AuthPage = ({ onAuthSuccess }: AuthPageProps) => {
  const [mode, setMode]         = useState<'login' | 'signup'>('login')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [showPwd, setShowPwd]   = useState(false)
  const [loading, setLoading]   = useState(false)

  const leftRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const formRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
    tl.fromTo(leftRef.current, { x: -30, opacity: 0 }, { x: 0, opacity: 1, duration: 0.65 })
      .fromTo(cardRef.current, { x: 30, opacity: 0, scale: 0.97 }, { x: 0, opacity: 1, scale: 1, duration: 0.65 }, '-=0.4')
  }, [])

  const switchMode = (m: 'login' | 'signup') => {
    if (m === mode) return
    gsap.to(formRef.current, { opacity: 0, y: 6, duration: 0.14, ease: 'power2.in',
      onComplete: () => {
        setMode(m); setEmail(''); setPassword(''); setFullName('')
        gsap.fromTo(formRef.current!, { opacity: 0, y: -6 }, { opacity: 1, y: 0, duration: 0.22, ease: 'power2.out' })
      }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password.trim()) { toast.error('Fill in all fields'); return }
    if (mode === 'signup' && !fullName.trim()) { toast.error('Enter your name'); return }
    if (password.length < 6) { toast.error('Password ≥ 6 characters'); return }
    setLoading(true)
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        toast.success('Welcome back!')
        onAuthSuccess()
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } })
        if (error) throw error
        if (data.user && !data.session) { toast.success('Check your email to confirm.', { duration: 6000 }); setMode('login') }
        else { toast.success('Account created!'); onAuthSuccess() }
      }
    } catch (err: any) {
      toast.error(err?.message?.includes('Invalid login') ? 'Invalid email or password' : err?.message || 'Auth failed')
    } finally { setLoading(false) }
  }

  return (
    <div className="flex min-h-[calc(100vh-56px)] items-center justify-center px-4 py-12"
      style={{ background: '#F2EDE6' }}>
      <div className="mx-auto grid w-full max-w-5xl items-center gap-16 lg:grid-cols-2">

        {/* Left */}
        <div ref={leftRef} className="hidden lg:block">
          <p className="section-label mb-6">Citizen Services Portal</p>
          <h2 className="mb-6 text-4xl font-black leading-tight tracking-tight" style={{ color: '#1A1A1A' }}>
            Your civic voice,<br />heard and resolved.
          </h2>
          <p className="mb-10 text-sm leading-7" style={{ color: '#666' }}>
            Register complaints, track resolution progress, and escalate unresolved
            issues — all backed by AI classification and department routing.
          </p>
          <ul className="space-y-3">
            {FEATURES.map(f => (
              <li key={f} className="flex items-center gap-3 text-sm" style={{ color: '#555' }}>
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                  style={{ background: 'rgba(22,163,74,0.1)', border: '1px solid rgba(22,163,74,0.25)' }}>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5.5l2 2 4-4" stroke="#15803D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                {f}
              </li>
            ))}
          </ul>
          <div className="mt-10 flex items-center gap-2">
            <ShieldCheck size={13} style={{ color: '#888' }} />
            <span className="text-xs" style={{ color: '#888' }}>Secured by Supabase · Data encrypted at rest</span>
          </div>
        </div>

        {/* Card */}
        <div ref={cardRef} className="mx-auto w-full max-w-md">
          <div className="overflow-hidden rounded-2xl"
            style={{ background: 'rgba(255,255,255,0.72)', border: '1px solid rgba(0,0,0,0.09)', boxShadow: '0 20px 60px rgba(0,0,0,0.1)', backdropFilter: 'blur(12px)' }}>

            {/* Tabs */}
            <div className="flex" style={{ borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
              {(['login', 'signup'] as const).map(tab => (
                <button key={tab} onClick={() => switchMode(tab)}
                  className="relative flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all duration-200"
                  style={{ color: mode === tab ? '#1A1A1A' : '#AAA', letterSpacing: '0.14em' }}>
                  {tab === 'login' ? 'Sign In' : 'Create Account'}
                  {mode === tab && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full" style={{ background: '#1A1A1A' }} />
                  )}
                </button>
              ))}
            </div>

            <div ref={formRef} className="p-8">
              <div className="mb-7">
                <h3 className="text-xl font-bold" style={{ color: '#1A1A1A' }}>
                  {mode === 'login' ? 'Welcome back' : 'Create your account'}
                </h3>
                <p className="mt-1.5 text-xs" style={{ color: '#888' }}>
                  {mode === 'login' ? 'Sign in to register and track your complaints.' : 'Join citizens of Bhopal on CivicMind.'}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === 'signup' && (
                  <div>
                    <label className="section-label mb-1.5 block">Full Name</label>
                    <div className="relative">
                      <User size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#AAA' }} />
                      <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                        placeholder="     Your full name" className="input-cream pl-9" autoComplete="name" />
                    </div>
                  </div>
                )}

                <div>
                  <label className="section-label mb-1.5 block">Email</label>
                  <div className="relative">
                    <Mail size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#AAA' }} />
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="     you@example.com" className="input-cream pl-9" autoComplete="email" />
                  </div>
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="section-label">Password</label>
                    {mode === 'login' && <span className="cursor-pointer text-[10px] font-semibold" style={{ color: '#888' }}>Forgot?</span>}
                  </div>
                  <div className="relative">
                    <Lock size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#AAA' }} />
                    <input type={showPwd ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                      placeholder={mode === 'signup' ? '     At least 6 characters' : '     Your password'}
                      className="input-cream pl-9 pr-10"
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
                    <button type="button" onClick={() => setShowPwd(p => !p)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2" style={{ color: '#AAA' }}>
                      {showPwd ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>
                </div>

                <button type="submit" disabled={loading} className="btn-ink mt-2 w-full py-3">
                  {loading ? <Loader2 size={15} className="animate-spin" /> : <>{mode === 'login' ? 'Sign In' : 'Create Account'}<ArrowRight size={13} /></>}
                </button>
              </form>

              <p className="mt-5 text-center text-[11px]" style={{ color: '#AAA' }}>
                {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
                <button onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
                  className="font-bold underline-offset-2 hover:underline" style={{ color: '#1A1A1A' }}>
                  {mode === 'login' ? 'Sign up' : 'Sign in'}
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AuthPage
