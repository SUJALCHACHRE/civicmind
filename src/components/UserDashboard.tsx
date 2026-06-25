import { useState, useEffect, useRef } from 'react'
import { ClipboardList, AlertTriangle, Clock, CheckCircle2, Activity, FileText, ShieldAlert, Loader2, ChevronRight, Calendar, MapPin, Tag } from 'lucide-react'
import { fetchComplaints } from '@/lib/api'
import { Complaint } from '@/types'
import { PRIORITY_COLORS, STATUS_COLORS } from '@/lib/constants'
import gsap from 'gsap'
import type { User } from '@supabase/supabase-js'

interface UserDashboardProps { user: User; onEscalate: (c: Complaint) => void; onNewComplaint: () => void }

const timeAgo = (d: string) => {
  const diff = Date.now() - new Date(d).getTime(), m = Math.floor(diff / 60000), h = Math.floor(m / 60), day = Math.floor(h / 24)
  return day > 0 ? `${day}d ago` : h > 0 ? `${h}h ago` : m > 0 ? `${m}m ago` : 'Just now'
}
const isSLABreached = (c: Complaint) => {
  if (c.status === 'Resolved' || c.status === 'Rejected') return false
  const d = new Date(c.created_at); d.setDate(d.getDate() + (c.estimated_resolution_days || 7))
  return Date.now() > d.getTime()
}

const priorityTag: Record<string, string> = { Critical: 'tag-critical', High: 'tag-high', Medium: 'tag-medium', Low: 'tag-low' }
const statusTag:   Record<string, string> = { 'Pending': 'tag-pending', 'In Progress': 'tag-in-progress', 'Resolved': 'tag-resolved', 'Rejected': 'tag-rejected' }

const UserDashboard = ({ user, onEscalate, onNewComplaint }: UserDashboardProps) => {
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [loading, setLoading]       = useState(true)
  const [selected, setSelected]     = useState<Complaint | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    load()
    gsap.fromTo(ref.current, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.55, ease: 'power2.out' })
  }, [user.email])

  const load = async () => {
    if (!user.email) return; setLoading(true)
    try { setComplaints(await fetchComplaints({ user_email: user.email })) } catch { /* handled */ } finally { setLoading(false) }
  }

  const stats = {
    total: complaints.length,
    critical: complaints.filter(c => c.priority === 'Critical').length,
    pending: complaints.filter(c => c.status === 'Pending').length,
    active: complaints.filter(c => c.status === 'In Progress').length,
    resolved: complaints.filter(c => c.status === 'Resolved').length,
  }

  if (loading) return (
    <div className="page-bg flex min-h-[400px] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="spinner" />
        <p className="section-label">Fetching your records…</p>
      </div>
    </div>
  )

  return (
    <div className="page-bg">
      <div ref={ref} className="mx-auto max-w-6xl px-4 py-10 sm:px-6">

        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="section-label mb-2">Citizen Dashboard</p>
            <h1 className="text-3xl font-black tracking-tight" style={{ color: '#1A1A1A' }}>
              {user.user_metadata?.full_name || 'My'} Records
            </h1>
            <p className="mt-1 text-sm" style={{ color: '#888' }}>Track and manage your registered civic complaints in Bhopal.</p>
          </div>
          <button onClick={onNewComplaint} className="btn-ink shrink-0 py-3 px-6">
            <FileText size={13} /> Register Complaint
          </button>
        </div>

        {/* Stats */}
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[
            { label: 'Total', value: stats.total,    Icon: FileText,      color: '#1D4ED8' },
            { label: 'Critical', value: stats.critical, Icon: AlertTriangle, color: '#B91C1C' },
            { label: 'Pending',  value: stats.pending,  Icon: Clock,         color: '#A16207' },
            { label: 'Active',   value: stats.active,   Icon: Activity,      color: '#1A1A1A' },
            { label: 'Resolved', value: stats.resolved, Icon: CheckCircle2,  color: '#15803D' },
          ].map(({ label, value, Icon, color }) => (
            <div key={label} className="card-cream-solid flex flex-col items-center p-4 text-center lift">
              <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: `${color}10` }}>
                <Icon size={15} style={{ color }} />
              </div>
              <span className="font-mono text-2xl font-black" style={{ color }}>{value}</span>
              <span className="section-label mt-1">{label}</span>
            </div>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">

          {/* List */}
          <div>
            <p className="section-label mb-3">Recent Registrations</p>
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {complaints.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-16 text-center"
                  style={{ borderColor: 'rgba(0,0,0,0.1)' }}>
                  <ClipboardList size={28} style={{ color: '#CCC' }} />
                  <p className="mt-3 text-sm font-semibold" style={{ color: '#AAA' }}>No records found</p>
                  <p className="mt-1 text-xs" style={{ color: '#CCC' }}>Register your first complaint</p>
                </div>
              ) : complaints.map(c => (
                <button key={c.id} onClick={() => setSelected(c)}
                  className="w-full rounded-xl border p-4 text-left transition-all"
                  style={selected?.id === c.id
                    ? { borderColor: '#1A1A1A', background: '#fff', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }
                    : { borderColor: 'rgba(0,0,0,0.08)', background: 'rgba(255,255,255,0.6)' }}>
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="font-mono text-[10px] font-bold" style={{ color: '#888' }}>{c.complaint_number}</span>
                        <span className={`tag ${priorityTag[c.priority] || 'tag-medium'}`}>{c.priority}</span>
                      </div>
                      <p className="truncate text-sm font-semibold" style={{ color: '#1A1A1A' }}>{c.complaint_type}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <span className={`tag ${statusTag[c.status] || 'tag-pending'}`}>{c.status}</span>
                        <span className="text-[10px]" style={{ color: '#CCC' }}>• {timeAgo(c.created_at)}</span>
                      </div>
                    </div>
                    <ChevronRight size={14} style={{ color: '#CCC', marginTop: 2, flexShrink: 0 }} />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Detail */}
          <div>
            {selected ? (
              <div className="card-cream-solid h-full overflow-hidden rounded-2xl">
                <div className="flex items-center justify-between border-b px-6 py-4" style={{ borderColor: 'rgba(0,0,0,0.07)', background: '#F9F7F4' }}>
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl border" style={{ borderColor: 'rgba(0,0,0,0.09)', background: '#fff' }}>
                      <ClipboardList size={16} style={{ color: '#1A1A1A' }} />
                    </div>
                    <div>
                      <p className="text-sm font-black" style={{ color: '#1A1A1A' }}>Complaint Overview</p>
                      <p className="font-mono text-[10px]" style={{ color: '#888' }}>{selected.complaint_number}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isSLABreached(selected) && <span className="tag tag-critical animate-pulse">SLA Breached</span>}
                    <span className={`tag ${statusTag[selected.status] || 'tag-pending'}`}>{selected.status}</span>
                  </div>
                </div>

                <div className="overflow-y-auto p-6">
                  <div className="mb-6 grid gap-6 md:grid-cols-2">
                    <div className="space-y-5">
                      {[
                        { Icon: Tag,      title: 'Issue Category', value: selected.complaint_type },
                        { Icon: MapPin,   title: 'Location', value: `${selected.ward} · ${selected.zone}${selected.address ? '\n' + selected.address : ''}` },
                        { Icon: Calendar, title: 'Registered', value: new Date(selected.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) },
                      ].map(({ Icon, title, value }) => (
                        <div key={title}>
                          <div className="section-label mb-1.5 flex items-center gap-1.5"><Icon size={10} />{title}</div>
                          <p className="text-sm font-semibold whitespace-pre-line" style={{ color: '#1A1A1A' }}>{value}</p>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-4">
                      <div className="rounded-xl border p-4" style={{ borderColor: 'rgba(37,99,235,0.15)', background: 'rgba(37,99,235,0.03)' }}>
                        <div className="section-label mb-2 flex items-center gap-1.5"><ShieldAlert size={10} style={{ color: '#1D4ED8' }} />AI Analysis</div>
                        <p className="text-sm leading-5" style={{ color: '#444' }}>{selected.summary}</p>
                      </div>
                      <div className="flex items-center justify-between rounded-xl border p-4" style={{ borderColor: 'rgba(0,0,0,0.08)', background: '#F9F7F4' }}>
                        <div>
                          <p className="section-label mb-1">Resolution SLA</p>
                          <span className="font-mono text-2xl font-black" style={{ color: '#1A1A1A' }}>{selected.estimated_resolution_days} Days</span>
                        </div>
                        <Clock size={22} style={{ color: '#DDD' }} />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border-l-4 p-4 mb-4" style={{ borderLeftColor: '#1A1A1A', background: 'rgba(26,26,26,0.03)', border: '1px solid rgba(0,0,0,0.08)', borderLeft: '4px solid #1A1A1A' }}>
                    <p className="section-label mb-2">Official Action Notice</p>
                    <p className="text-sm italic leading-5" style={{ color: '#444' }}>{selected.action_notice}</p>
                  </div>

                  {isSLABreached(selected) && (
                    <div className="flex flex-col gap-4 rounded-xl border p-5 sm:flex-row sm:items-center sm:justify-between"
                      style={{ borderColor: 'rgba(220,38,38,0.25)', background: 'rgba(220,38,38,0.04)' }}>
                      <div className="flex items-start gap-3">
                        <AlertTriangle size={18} style={{ color: '#B91C1C', marginTop: 2, flexShrink: 0 }} />
                        <div>
                          <p className="text-sm font-black" style={{ color: '#991B1B' }}>SLA Breach Detected</p>
                          <p className="text-xs" style={{ color: '#B91C1C' }}>This complaint exceeded its resolution deadline. You may escalate.</p>
                        </div>
                      </div>
                      <button onClick={() => onEscalate(selected)} className="btn-ink shrink-0 py-2.5 px-5"
                        style={{ background: '#B91C1C' }}>
                        <ShieldAlert size={13} /> Escalate
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex h-full min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed p-12 text-center"
                style={{ borderColor: 'rgba(0,0,0,0.1)' }}>
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: 'rgba(0,0,0,0.04)' }}>
                  <FileText size={24} style={{ color: '#CCC' }} />
                </div>
                <p className="text-sm font-bold" style={{ color: '#1A1A1A' }}>No Selection</p>
                <p className="mt-1 max-w-xs text-xs" style={{ color: '#AAA' }}>Select a record from the list to view analysis and tracking.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default UserDashboard
