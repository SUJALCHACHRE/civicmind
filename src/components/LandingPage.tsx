import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ArrowRight, Mail, MapPin, Zap, Users, TrendingUp, Shield } from 'lucide-react'

interface LandingPageProps {
  onGetStarted: () => void
}

const STATS = [
  { icon: Users,      value: '12,400+', label: 'Citizens served'    },
  { icon: TrendingUp, value: '99.2%',   label: 'Routing accuracy'   },
  { icon: Zap,        value: '< 2s',    label: 'AI response time'   },
  { icon: Shield,     value: '85',      label: 'Wards covered'      },
]

const LandingPage = ({ onGetStarted }: LandingPageProps) => {
  const rootRef     = useRef<HTMLDivElement>(null)
  const titleRef    = useRef<HTMLDivElement>(null)
  const statueRef   = useRef<HTMLImageElement>(null)
  const navRef      = useRef<HTMLElement>(null)
  const taglineRef  = useRef<HTMLDivElement>(null)
  const cardRef     = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })

    tl.fromTo(navRef.current,
        { y: -30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6 })
      .fromTo(titleRef.current,
        { y: 60, opacity: 0, scale: 0.94 },
        { y: 0, opacity: 1, scale: 1, duration: 0.9, ease: 'expo.out' }, '-=0.3')
      .fromTo(statueRef.current,
        { y: 80, opacity: 0, scale: 0.92 },
        { y: 0, opacity: 1, scale: 1, duration: 1.1, ease: 'expo.out' }, '-=0.6')
      .fromTo(taglineRef.current,
        { x: -30, opacity: 0 }, { x: 0, opacity: 1, duration: 0.6 }, '-=0.4')
      .fromTo(cardRef.current,
        { x: 30, opacity: 0 }, { x: 0, opacity: 1, duration: 0.6 }, '-=0.4')

    // Subtle float on the statue
    
  }, [])

  return (
    <div
      ref={rootRef}
      className="relative h-screen w-screen overflow-hidden"
      style={{ background: '#F2EDE6', fontFamily: "'Space Grotesk', sans-serif" }}
    >
      {/* ── Subtle grain texture overlay ── */}
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-[0.035]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
        }}
      />

      {/* ── TOP NAV ── */}
      <nav
        ref={navRef}
        className="relative z-20 flex items-center justify-between px-8 py-6 md:px-14"
      >
        {/* Logo */}
        <div className="flex items-center gap-3">
          <span
            className="text-base font-black tracking-[0.18em] uppercase"
            style={{ color: '#1A1A1A', letterSpacing: '0.22em' }}
          >
            CIVICMIND
          </span>
          <span className="h-5 w-px" style={{ background: '#C4BAB0' }} />
          <button
            className="flex h-7 w-7 items-center justify-center rounded-full transition-all hover:scale-110"
            style={{ background: 'rgba(0,0,0,0.06)' }}
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <circle cx="5.5" cy="5.5" r="4.5" stroke="#555" strokeWidth="1.3"/>
              <line x1="9" y1="9" x2="12" y2="12" stroke="#555" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Nav links */}
        

        {/* CTA buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={onGetStarted}
            className="rounded-full px-5 py-2 text-xs font-bold uppercase tracking-widest transition-all hover:opacity-80"
            style={{ background: 'rgba(0,0,0,0.07)', color: '#1A1A1A', letterSpacing: '0.1em' }}
          >
            Sign In
          </button>
          <button
            onClick={onGetStarted}
            className="flex items-center gap-2 rounded-full px-5 py-2 text-xs font-bold uppercase tracking-widest text-white transition-all hover:scale-105 hover:shadow-lg"
            style={{ background: '#1A1A1A', letterSpacing: '0.1em' }}
          >
            Get Started
            <ArrowRight size={12} />
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <div className="absolute inset-0 z-10 flex flex-col">
        {/* Giant title – sits near the top, behind the statue */}
        <div
          ref={titleRef}
          className="relative select-none px-4 pt-4 text-center"
          style={{ marginTop: '6vh' }}
        >
          <h1
            className="inline-block font-black uppercase leading-none"
            style={{
              fontSize: 'clamp(80px, 15vw, 210px)',
              color: '#1A1A1A',
              letterSpacing: '-0.03em',
            }}
          >
            CIVIC<span style={{ color: '#1A1A1A' }}>MIND</span>
            <sup
              className="align-super"
              style={{ fontSize: '0.28em', letterSpacing: '0', color: '#1A1A1A' }}
            >
              ®
            </sup>
          </h1>
        </div>

        {/* Statue – absolutely pinned, bottom flush with viewport */}
        <img
          ref={statueRef}
          src="/hero_statue.png"
          alt="Bhopal civic hero"
          className="pointer-events-none absolute left-1/2 z-20 object-contain"
          style={{
            bottom: 48,          /* sits just above the feature strip */
            transform: 'translateX(-50%)',
            height: 'calc(100vh - 140px)',  /* almost full viewport height */
            width: 'auto',
            maxWidth: '90vw',
            filter: 'drop-shadow(0 50px 70px rgba(0,0,0,0.20))',
          }}
        />

        {/* ── Bottom info strip – overlaid above feature bar ── */}
        <div
          className="absolute bottom-[48px] left-0 right-0 z-30 flex items-end justify-between px-8 pb-6 md:px-14"
          style={{ pointerEvents: 'none' }}
        >
          {/* Left tagline */}
          <div ref={taglineRef} style={{ pointerEvents: 'auto' }}>
            <p className="text-sm font-semibold leading-snug" style={{ color: '#1A1A1A' }}>
              Rethinking civic services<br />beyond expectations.
            </p>
            <button
              onClick={onGetStarted}
              className="mt-3 flex items-center gap-1.5 text-xs font-medium transition-opacity hover:opacity-70"
              style={{ color: '#666' }}
            >
              Here's how it works ↓
            </button>
          </div>

          {/* Right card */}
          <div
            ref={cardRef}
            className="max-w-[210px] rounded-2xl p-4 shadow-xl"
            style={{ background: '#1A1A1A', color: '#fff', pointerEvents: 'auto' }}
          >
            <p className="mb-3 text-xs leading-relaxed" style={{ color: '#CCC' }}>
              Great civic experiences are born from quick, transparent action.
            </p>
            <button
              onClick={onGetStarted}
              className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold uppercase tracking-widest transition-all hover:opacity-80"
              style={{ background: '#F2EDE6', color: '#1A1A1A', letterSpacing: '0.1em' }}
            >
              <Mail size={12} />
              Get in Touch
            </button>
          </div>
        </div>
      </div>

      {/* ── Features strip – pinned to very bottom ── */}
      <div
        className="absolute bottom-0 left-0 right-0 z-40 flex items-center overflow-x-auto"
        style={{ background: '#1A1A1A', borderTop: '1px solid rgba(255,255,255,0.06)', height: '48px' }}
      >
        {[
          'AI Classification',
          'Ward-level Routing',
          'Real-time Tracking',
          'SLA Enforcement',
          'Priority Scoring',
          'Escalation Reports',
        ].map((item, i) => (
          <div
            key={item}
            className="flex shrink-0 items-center px-8"
            style={{ borderRight: i < 5 ? '1px solid rgba(255,255,255,0.08)' : 'none', height: '100%' }}
          >
            <span
              className="text-[10px] font-semibold uppercase tracking-widest whitespace-nowrap"
              style={{ color: '#888', letterSpacing: '0.12em' }}
            >
              {item}
            </span>
          </div>
        ))}
      </div>

      {/* ── Location badge ── */}
      <div
        className="absolute left-8 top-1/2 z-20 hidden -translate-y-1/2 items-center gap-2 rounded-full px-4 py-2 md:flex"
        style={{ background: 'rgba(0,0,0,0.07)', backdropFilter: 'blur(8px)' }}
      >
        <MapPin size={12} style={{ color: '#555' }} />
        <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#555', letterSpacing: '0.12em' }}>
          Bhopal, MP
        </span>
      </div>
    </div>
  )
}

export default LandingPage
