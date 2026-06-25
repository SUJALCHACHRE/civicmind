import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { Copy, ArrowRight, LayoutDashboard, FileText, FileSearch, Clock3, Route, Check } from 'lucide-react'
import { toast } from 'sonner'
import { Complaint } from '@/types'
import { DEPARTMENT_NAMES, DEPARTMENT_ICONS, COMPLAINT_TYPE_ICONS } from '@/lib/constants'

/* ── AgentPipeline — also used by Dashboard ── */
const PIPE_AGENTS = [
  { name: 'Classification', Icon: FileSearch },
  { name: 'Priority',       Icon: Clock3 },
  { name: 'Routing',        Icon: Route },
]

export const AgentPipeline = () => (
  <div className="flex items-center justify-center gap-2 py-2">
    {PIPE_AGENTS.map((a, i) => (
      <div key={i} className="flex items-center gap-2">
        <div className="flex flex-col items-center gap-1">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border-2"
            style={{ borderColor: '#1A1A1A', background: '#fff' }}>
            <a.Icon size={14} style={{ color: '#1A1A1A' }} />
          </div>
          <span className="font-mono text-[9px]" style={{ color: '#AAA' }}>{a.name}</span>
          <div className="flex h-4 w-4 items-center justify-center rounded-full" style={{ background: '#1A1A1A' }}>
            <Check size={8} color="#F2EDE6" />
          </div>
        </div>
        {i < 2 && <div className="h-0.5 w-10 rounded-full" style={{ background: 'rgba(0,0,0,0.15)' }} />}
      </div>
    ))}
  </div>
)

/* ── ResultView ── */
interface ResultViewProps { complaint: Complaint; onNewComplaint: () => void; onDashboard: () => void }

const AGENTS = [
  { name: 'Classification', icon: FileSearch, label: 'Review 1' },
  { name: 'Priority',       icon: Clock3,     label: 'Review 2' },
  { name: 'Routing',        icon: Route,      label: 'Review 3' },
]

const priorityTag: Record<string, string> = {
  Critical: 'tag-critical', High: 'tag-high', Medium: 'tag-medium', Low: 'tag-low',
}

const ResultView = ({ complaint, onNewComplaint, onDashboard }: ResultViewProps) => {
  const ref     = useRef<HTMLDivElement>(null)
  const pipeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    gsap.fromTo(ref.current?.querySelectorAll('.item') ?? [],
      { y: 18, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.5, stagger: 0.09, ease: 'power2.out', delay: 0.1 })
    if (pipeRef.current) {
      gsap.fromTo(pipeRef.current.querySelectorAll('.node'),
        { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.4, stagger: 0.15, ease: 'back.out(1.7)', delay: 0.5 })
      gsap.fromTo(pipeRef.current.querySelectorAll('.line'),
        { scaleX: 0 }, { scaleX: 1, duration: 0.3, stagger: 0.15, ease: 'power2.out', delay: 0.7 })
    }
  }, [])

  return (
    <div className="page-bg">
      <div ref={ref} className="mx-auto max-w-2xl px-4 py-12">

        {/* Success header */}
        <div className="item mb-8 text-center">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full"
            style={{ border: '2px solid #1A1A1A', background: 'rgba(26,26,26,0.04)' }}>
            <svg width="38" height="38" viewBox="0 0 52 52" fill="none">
              <circle className="checkmark-circle" cx="26" cy="26" r="25" fill="none" stroke="#1A1A1A" strokeWidth="2" />
              <path className="checkmark-check" d="M14.1 27.2l7.1 7.2 16.7-16.8" fill="none"
                stroke="#1A1A1A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h2 className="text-2xl font-black tracking-tight" style={{ color: '#1A1A1A' }}>Complaint Registered</h2>
          <p className="font-mono mt-2 text-base font-bold" style={{ color: '#555' }}>{complaint.complaint_number}</p>
        </div>

        {/* Info grid */}
        <div className="item mb-4 grid grid-cols-2 gap-3">
          {[
            { label: 'Complaint Type', content: <div className="flex items-center gap-2"><span className="text-lg">{COMPLAINT_TYPE_ICONS[complaint.complaint_type] || '📋'}</span><span className="text-sm font-semibold" style={{ color: '#1A1A1A' }}>{complaint.complaint_type}</span></div> },
            { label: 'Priority Level',  content: <span className={`tag ${priorityTag[complaint.priority] || 'tag-medium'}`}>{complaint.priority}</span> },
            { label: 'Department',      content: <div className="flex items-center gap-2"><span>{DEPARTMENT_ICONS[complaint.department] || '🏢'}</span><span className="text-sm font-semibold" style={{ color: '#1A1A1A' }}>{DEPARTMENT_NAMES[complaint.department] || complaint.department}</span></div> },
            { label: 'Est. Resolution', content: <div className="flex items-baseline gap-1"><span className="font-mono text-2xl font-black" style={{ color: '#1A1A1A' }}>{complaint.estimated_resolution_days}</span><span className="text-xs" style={{ color: '#888' }}>days</span></div> },
          ].map(({ label, content }) => (
            <div key={label} className="card-cream-solid p-4">
              <p className="section-label mb-2">{label}</p>
              {content}
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="item card-cream-solid mb-3 p-5">
          <p className="section-label mb-3" style={{ color: '#1A1A1A' }}>Review summary</p>
          <p className="text-sm leading-6" style={{ color: '#444' }}>{complaint.summary}</p>
          <div className="mt-4 border-t pt-4" style={{ borderColor: 'rgba(0,0,0,0.07)' }}>
            <p className="section-label mb-1">Priority reason</p>
            <p className="text-sm" style={{ color: '#666' }}>{complaint.priority_reason}</p>
          </div>
        </div>

        {/* Action notice */}
        <div className="item mb-4 rounded-xl p-5"
          style={{ borderLeft: '4px solid #1A1A1A', background: 'rgba(26,26,26,0.03)', border: '1px solid rgba(0,0,0,0.08)', borderLeftWidth: '4px', borderLeftColor: '#1A1A1A' }}>
          <div className="mb-2 flex items-center justify-between">
            <p className="section-label">Official Action Notice</p>
            <button onClick={() => { navigator.clipboard.writeText(complaint.action_notice || ''); toast.success('Copied') }}
              className="flex items-center gap-1 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-widest transition-colors hover:bg-white"
              style={{ borderColor: 'rgba(0,0,0,0.1)', color: '#888' }}>
              <Copy size={10} /> Copy
            </button>
          </div>
          <p className="text-sm italic leading-6" style={{ color: '#444' }}>{complaint.action_notice}</p>
        </div>

        {/* Pipeline */}
        <div className="item card-cream-solid mb-8 p-5">
          <p className="section-label mb-4 text-center">Registration review pipeline</p>
          <div ref={pipeRef} className="flex items-center justify-center gap-2">
            {AGENTS.map((a, i) => {
              const Icon = a.icon
              return (
                <div key={i} className="flex items-center gap-2">
                  <div className="node flex flex-col items-center gap-1">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl border-2"
                      style={{ borderColor: '#1A1A1A', background: '#fff' }}>
                      <Icon size={16} style={{ color: '#1A1A1A' }} />
                    </div>
                    <span className="font-mono text-[9px]" style={{ color: '#AAA' }}>{a.label}</span>
                    <span className="text-[9px] font-semibold" style={{ color: '#555' }}>{a.name}</span>
                    <div className="flex h-4 w-4 items-center justify-center rounded-full" style={{ background: '#1A1A1A' }}>
                      <Check size={8} color="#F2EDE6" />
                    </div>
                  </div>
                  {i < 2 && <div className="line h-0.5 w-14 origin-left rounded-full" style={{ background: 'rgba(0,0,0,0.15)' }} />}
                </div>
              )
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="item flex gap-3">
          <button onClick={onNewComplaint} className="btn-outline-ink flex-1 py-3">
            <FileText size={13} /> New Complaint
          </button>
          <button onClick={onDashboard} className="btn-ink flex-1 py-3">
            <LayoutDashboard size={13} /> View Dashboard <ArrowRight size={13} />
          </button>
        </div>
      </div>
    </div>
  )
}

export default ResultView
