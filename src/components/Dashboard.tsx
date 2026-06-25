import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import gsap from 'gsap'
import { toast } from 'sonner'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  Activity,
  FileText,
  Copy,
  RefreshCw,
  Filter,
  Loader2,
  ShieldAlert,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AgentPipeline } from '@/components/ResultView'
import BhopalMap from '@/components/BhopalMap'
import { fetchComplaints, fetchStats, updateComplaintStatus } from '@/lib/api'
import {
  PRIORITY_COLORS,
  STATUS_COLORS,
  DEPARTMENT_NAMES,
  DEPARTMENT_ICONS,
  COMPLAINT_TYPE_ICONS,
} from '@/lib/constants'
import { Complaint, Stats } from '@/types'

const FILTER_TABS = ['All', 'Critical', 'High', 'Pending', 'Resolved'] as const

const SkeletonBlock = ({
  className = '',
  style,
}: {
  className?: string
  style?: CSSProperties
}) => (
  <div
    className={`animate-pulse rounded-md bg-white/5 ${className}`}
    style={style}
  />
)

const StatCard = ({
  label,
  value,
  color,
  icon: Icon,
  delay = 0,
}: {
  label: string
  value: number
  color: string
  icon: any
  delay?: number
}) => {
  const countRef = useRef<HTMLSpanElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (countRef.current && cardRef.current) {
      gsap.fromTo(cardRef.current, { y: 20, opacity: 0 }, {
        y: 0,
        opacity: 1,
        duration: 0.5,
        delay,
        ease: 'power2.out',
      })

      const obj = { val: 0 }
      gsap.to(obj, {
        val: value,
        duration: 1.5,
        delay: delay + 0.2,
        ease: 'power2.out',
        onUpdate: () => {
          if (countRef.current) {
            countRef.current.textContent = Math.round(obj.val).toString()
          }
        },
      })
    }
  }, [value, delay])

  return (
    <div
      ref={cardRef}
      className="flex flex-1 items-center gap-3 rounded-lg border px-4 py-2 transition-all hover:border-[var(--cm-border-bright)] shadow-sm"
      style={{ borderColor: 'var(--cm-border)', background: 'var(--cm-bg-card)' }}
    >
      <div
        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg"
        style={{ background: `${color}15` }}
      >
        <Icon size={18} style={{ color }} />
      </div>
      <div className="flex flex-col justify-center">
        <span className="text-[10px] font-mono uppercase tracking-wider leading-tight" style={{ color: 'var(--cm-text-muted)' }}>
          {label}
        </span>
        <span ref={countRef} className="font-mono text-xl font-bold leading-tight" style={{ color }}>
          0
        </span>
      </div>
    </div>
  )
}

const Dashboard = ({ isAdmin = false, onEscalate }: { isAdmin?: boolean, onEscalate?: (complaint: Complaint) => void }) => {
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState('All')
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null)
  const [wardFilter, setWardFilter] = useState<string | null>(null)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  // Helper: has the SLA deadline passed for a non-resolved complaint?
  const isSLABreached = (c: Complaint) => {
    if (c.status === 'Resolved' || c.status === 'Rejected') return false
    const deadline = new Date(c.created_at)
    deadline.setDate(deadline.getDate() + (c.estimated_resolution_days || 7))
    return Date.now() > deadline.getTime()
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const [cData, sData] = await Promise.all([fetchComplaints(), fetchStats()])
      setComplaints(cData)
      setStats(sData)
    } catch (err) {
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    setUpdatingStatus(true)
    try {
      const updated = await updateComplaintStatus(id, newStatus)
      if (updated) {
        toast.success(`Status updated to ${newStatus}`)
        loadData()
        if (selectedComplaint?.id === id) {
          setSelectedComplaint({ ...selectedComplaint, status: newStatus as Complaint['status'] })
        }
      }
    } catch {
      toast.error('Failed to update status')
    } finally {
      setUpdatingStatus(false)
    }
  }

  const timeAgo = (dateStr: string) => {
    const d = new Date(dateStr).getTime()
    const diff = Date.now() - d
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)
    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    if (minutes > 0) return `${minutes}m ago`
    return 'Just now'
  }

  const filteredComplaints = complaints.filter(c => {
    if (activeFilter !== 'All' && activeFilter !== c.priority && activeFilter !== c.status) return false
    if (wardFilter && c.ward !== wardFilter) return false
    return true
  })

  const priorityChartData = stats?.by_priority?.map(p => ({
    name: p.priority,
    count: p.count,
    fill: PRIORITY_COLORS[p.priority] || '#3B82F6',
  })) || []

  const deptChartData = stats?.by_department?.map(d => ({
    name: DEPARTMENT_NAMES[d.department] ? d.department : d.department,
    fullName: DEPARTMENT_NAMES[d.department] || d.department,
    count: d.count,
  })) || []

  const isInitialLoad = loading && !stats && complaints.length === 0

  return (
    <div className="mx-auto max-w-[1600px] h-[calc(100vh-64px)] flex flex-col px-4 py-4 overflow-hidden">
      <div className="mb-4 flex flex-shrink-0 items-center justify-between gap-6">
        <div className="min-w-[200px]">
          <h2 className="font-display text-xl font-bold leading-tight" style={{ color: 'var(--cm-text-primary)' }}>
            {isAdmin ? 'Admin Operations' : 'Citizen Dashboard'}
          </h2>
          <p className="text-xs" style={{ color: 'var(--cm-text-secondary)' }}>
            Bhopal Municipal Corporation
          </p>
        </div>

        <div className="flex flex-1 items-center gap-3">
          {isInitialLoad ? (
            Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex-1 rounded-lg border p-2" style={{ borderColor: 'var(--cm-border)', background: 'var(--cm-bg-card)' }}>
                <SkeletonBlock className="h-6 w-full" />
              </div>
            ))
          ) : (
            <>
              <StatCard label="Total" value={stats?.total || 0} color="#3B82F6" icon={FileText} delay={0} />
              <StatCard label="Critical" value={stats?.by_priority?.find(p => p.priority === 'Critical')?.count || 0} color="#EF4444" icon={AlertTriangle} delay={0.1} />
              <StatCard label="Pending" value={stats?.by_status?.find(s => s.status === 'Pending')?.count || 0} color="#F59E0B" icon={Clock} delay={0.2} />
              <StatCard label="In Progress" value={stats?.by_status?.find(s => s.status === 'In Progress')?.count || 0} color="#3B82F6" icon={Activity} delay={0.3} />
              <StatCard label="Resolved" value={stats?.by_status?.find(s => s.status === 'Resolved')?.count || 0} color="#10B981" icon={CheckCircle2} delay={0.4} />
            </>
          )}
        </div>

        <Button
          onClick={loadData}
          disabled={loading}
          variant="outline"
          size="sm"
          className="gap-2 min-w-[100px] border-[var(--cm-border)] bg-[var(--cm-bg-card)] hover:bg-[var(--cm-bg-elevated)]"
          style={{ color: 'var(--cm-text-secondary)' }}
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          {loading ? '...' : 'Refresh'}
        </Button>
      </div>

      <div className="flex-1 grid grid-cols-12 gap-4 min-h-0">
        
        {/* LEFT COL: COMPLAINT LIST */}
        <div className="col-span-3 rounded-lg border flex flex-col bg-[var(--cm-bg-card)] shadow-sm overflow-hidden" style={{ borderColor: 'var(--cm-border)' }}>
          <div className="flex items-center gap-2 border-b px-3 py-2 flex-shrink-0" style={{ borderColor: 'var(--cm-border)' }}>
            <Filter size={14} style={{ color: 'var(--cm-text-muted)' }} />
            <div className="flex gap-1 overflow-x-auto no-scrollbar">
              {FILTER_TABS.map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveFilter(tab)}
                  className="rounded-md px-2 py-0.5 text-[10px] font-medium transition-colors flex-shrink-0"
                  style={{
                    background: activeFilter === tab ? 'var(--cm-blue)' : 'transparent',
                    color: activeFilter === tab ? 'white' : 'var(--cm-text-secondary)',
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {isInitialLoad ? (
                <div className="space-y-2 p-3">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div key={index} className="rounded-md border p-2" style={{ borderColor: 'var(--cm-border)', background: 'var(--cm-bg-secondary)' }}>
                      <SkeletonBlock className="mb-2 h-3 w-16" />
                      <SkeletonBlock className="h-3 w-32" />
                    </div>
                  ))}
                </div>
              ) : filteredComplaints.length === 0 ? (
                <div className="p-8 text-center" style={{ color: 'var(--cm-text-muted)' }}>
                  <p className="text-sm">No complaints found</p>
                </div>
              ) : (
                filteredComplaints.map(complaint => (
                  <button
                    key={complaint.id}
                    onClick={() => setSelectedComplaint(complaint)}
                    className="w-full border-b px-3 py-2.5 text-left transition-colors hover:bg-[var(--cm-bg-elevated)]"
                    style={{
                      borderColor: 'var(--cm-border)',
                      background: selectedComplaint?.id === complaint.id ? 'var(--cm-bg-elevated)' : undefined,
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center gap-1.5">
                          <span className="text-[10px] font-mono" style={{ color: 'var(--cm-blue)' }}>
                            {complaint.complaint_number}
                          </span>
                          <Badge className="px-1 py-0 text-[9px]" style={{ background: `${PRIORITY_COLORS[complaint.priority]}20`, color: PRIORITY_COLORS[complaint.priority], border: `1px solid ${PRIORITY_COLORS[complaint.priority]}30` }}>
                            {complaint.priority}
                          </Badge>
                        </div>
                        <div className="mb-0.5 flex items-center gap-1.5">
                          <span className="text-xs">{COMPLAINT_TYPE_ICONS[complaint.complaint_type] || '[#]'}</span>
                          <span className="truncate text-xs font-medium" style={{ color: 'var(--cm-text-primary)' }}>
                            {complaint.complaint_type}
                          </span>
                        </div>
                        <p className="truncate text-[10px]" style={{ color: 'var(--cm-text-secondary)' }}>
                          {complaint.summary || complaint.description}
                        </p>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <div className="text-[9px] font-mono mb-1" style={{ color: 'var(--cm-text-muted)' }}>
                          {timeAgo(complaint.created_at)}
                        </div>
                        <div className="flex items-center justify-end gap-1">
                          <div className="h-1.5 w-1.5 rounded-full" style={{ background: STATUS_COLORS[complaint.status] || '#3B82F6' }} />
                          <span className="text-[9px]" style={{ color: STATUS_COLORS[complaint.status] }}>{complaint.status}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))
              )}
          </div>
        </div>

        {/* MIDDLE COL: MAP & CHARTS */}
        <div className="col-span-6 flex flex-col gap-4 min-h-0">
          <div className="rounded-lg border shadow-sm flex flex-col flex-1 min-h-[250px] bg-[var(--cm-bg-card)] overflow-hidden" style={{ borderColor: 'var(--cm-border)' }}>
             <div className="flex items-center justify-between border-b px-3 py-2 flex-shrink-0" style={{ borderColor: 'var(--cm-border)' }}>
              <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'var(--cm-text-muted)' }}>
                BHOPAL WARD MAP
              </span>
              {wardFilter && (
                <button onClick={() => setWardFilter(null)} className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px]" style={{ background: 'var(--cm-blue)', color: 'white' }}>
                  {wardFilter} x
                </button>
              )}
            </div>
            <div className="flex-1">
              {isInitialLoad ? (
                <div className="h-full bg-[var(--cm-bg-secondary)] p-4"><SkeletonBlock className="h-full w-full rounded-xl" /></div>
              ) : (
                <BhopalMap complaints={complaints} onWardClick={setWardFilter} />
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 h-[220px] flex-shrink-0">
            {/* Priority Chart */}
            <div className="rounded-lg border shadow-sm flex flex-col bg-[var(--cm-bg-card)]" style={{ borderColor: 'var(--cm-border)' }}>
              <div className="border-b px-3 py-2 flex-shrink-0" style={{ borderColor: 'var(--cm-border)' }}>
                <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'var(--cm-text-muted)' }}>PRIORITY BREAKDOWN</span>
              </div>
              <div className="flex-1 p-2">
                 {isInitialLoad ? (
                  <SkeletonBlock className="h-full w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={priorityChartData} layout="vertical" margin={{ left: 5, right: 20 }}>
                      <defs>
                        <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="currentColor" stopOpacity={0.8} />
                          <stop offset="100%" stopColor="currentColor" stopOpacity={1} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--cm-border)" horizontal={false} opacity={0.4} />
                      <XAxis type="number" hide />
                      <YAxis type="category" dataKey="name" width={60} tick={{ fill: 'var(--cm-text-secondary)', fontSize: 10, fontWeight: 500 }} axisLine={false} tickLine={false} />
                      <RechartsTooltip cursor={{ fill: 'rgba(0,0,0,0.03)' }} content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="rounded-lg border bg-white p-2 shadow-xl" style={{ borderColor: 'var(--cm-border)' }}>
                              <p className="text-xs font-bold" style={{ color: (payload[0].payload as any).fill }}>
                                {String(payload[0].name ?? '').toUpperCase()}
                              </p>
                              <p className="text-lg font-mono font-bold">{payload[0].value}</p>
                              <p className="text-[10px] text-gray-500">Active complaints</p>
                            </div>
                          )
                        }
                        return null
                      }} />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={20}>
                        {priorityChartData.map((entry, index) => <Cell key={index} fill={entry.fill} fillOpacity={0.9} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Dept Chart */}
            <div className="rounded-lg border shadow-sm flex flex-col bg-[var(--cm-bg-card)]" style={{ borderColor: 'var(--cm-border)' }}>
              <div className="border-b px-3 py-2 flex-shrink-0" style={{ borderColor: 'var(--cm-border)' }}>
                <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'var(--cm-text-muted)' }}>DEPARTMENT LOAD</span>
              </div>
              <div className="flex-1 p-2">
                  {isInitialLoad ? (
                  <SkeletonBlock className="h-full w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={deptChartData} margin={{ bottom: 10 }}>
                      <defs>
                        {deptChartData.map((_, i) => (
                          <linearGradient key={`grad-${i}`} id={`grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'][i % 7]} stopOpacity={1} />
                            <stop offset="100%" stopColor={['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'][i % 7]} stopOpacity={0.6} />
                          </linearGradient>
                        ))}
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--cm-border)" vertical={false} opacity={0.4} />
                      <XAxis dataKey="name" tick={{ fill: 'var(--cm-text-secondary)', fontSize: 9, fontWeight: 500 }} axisLine={false} tickLine={false} angle={-20} textAnchor="end" interval={0} />
                      <YAxis tick={{ fill: 'var(--cm-text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <RechartsTooltip cursor={{ fill: 'rgba(0,0,0,0.02)' }} content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="rounded-lg border bg-white p-2 shadow-xl" style={{ borderColor: 'var(--cm-border)' }}>
                              <p className="text-[10px] font-mono font-bold uppercase text-gray-400">{payload[0].payload.fullName}</p>
                              <div className="mt-1 flex items-baseline gap-2">
                                <span className="text-xl font-bold">{payload[0].value}</span>
                                <span className="text-[10px] text-gray-500">cases</span>
                              </div>
                            </div>
                          )
                        }
                        return null
                      }} />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={20}>
                        {deptChartData.map((_, index) => <Cell key={index} fill={`url(#grad-${index})`} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COL: DETAILS */}
        <div className="col-span-3 rounded-lg border flex flex-col bg-[var(--cm-bg-card)] shadow-sm overflow-hidden" style={{ borderColor: 'var(--cm-border)' }}>
          {isInitialLoad ? (
              <div className="space-y-4 p-4">
                <SkeletonBlock className="h-4 w-28" />
                <SkeletonBlock className="h-5 w-40" />
                <SkeletonBlock className="h-16 w-full" />
                <SkeletonBlock className="h-20 w-full" />
                <SkeletonBlock className="h-10 w-full" />
              </div>
            ) : selectedComplaint ? (
              <div className="flex flex-col h-full">
                <div className="border-b px-4 py-3 flex-shrink-0" style={{ borderColor: 'var(--cm-border)' }}>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono font-semibold" style={{ color: 'var(--cm-blue)' }}>
                      {selectedComplaint.complaint_number}
                    </span>
                    <Badge
                      className="text-[10px] px-1.5 py-0"
                      style={{
                        background: `${PRIORITY_COLORS[selectedComplaint.priority]}20`,
                        color: PRIORITY_COLORS[selectedComplaint.priority],
                        border: `1px solid ${PRIORITY_COLORS[selectedComplaint.priority]}30`,
                      }}
                    >
                      {selectedComplaint.priority}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm font-medium" style={{ color: 'var(--cm-text-primary)' }}>
                    {selectedComplaint.complaint_type}
                  </p>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                  <div>
                    <span className="mb-1 block text-[10px] font-mono uppercase tracking-wider" style={{ color: 'var(--cm-text-muted)' }}>Citizen</span>
                    <p className="text-[13px]" style={{ color: 'var(--cm-text-primary)' }}>{selectedComplaint.citizen_name}</p>
                    <p className="text-[11px]" style={{ color: 'var(--cm-text-secondary)' }}>{selectedComplaint.ward} | {selectedComplaint.zone}</p>
                  </div>

                  <div>
                    <span className="mb-1 block text-[10px] font-mono uppercase tracking-wider" style={{ color: 'var(--cm-blue)' }}>Review Summary</span>
                    <p className="text-[13px]" style={{ color: 'var(--cm-text-primary)' }}>{selectedComplaint.summary}</p>
                  </div>

                  <div>
                    <span className="mb-1 block text-[10px] font-mono uppercase tracking-wider" style={{ color: 'var(--cm-text-muted)' }}>Priority Reason</span>
                    <p className="text-[13px]" style={{ color: 'var(--cm-text-secondary)' }}>{selectedComplaint.priority_reason}</p>
                  </div>

                  {selectedComplaint.image_analysis && (
                    <div className="rounded-lg border p-3" style={{ borderColor: 'var(--cm-border)', background: 'var(--cm-bg-elevated)' }}>
                      <span className="mb-1 block text-[10px] font-mono uppercase tracking-wider" style={{ color: 'var(--cm-blue)' }}>Image Analysis</span>
                      {selectedComplaint.attachment_name && (
                        <p className="mb-2 truncate text-[11px]" style={{ color: 'var(--cm-text-muted)' }}>{selectedComplaint.attachment_name}</p>
                      )}
                      <p className="text-[13px] font-medium" style={{ color: 'var(--cm-text-primary)' }}>{selectedComplaint.image_analysis.visible_issue || 'Attached image reviewed'}</p>
                      <p className="mt-1 text-[13px] leading-relaxed" style={{ color: 'var(--cm-text-secondary)' }}>{selectedComplaint.image_analysis.summary || 'No structured image summary returned.'}</p>
                      {Array.isArray(selectedComplaint.image_analysis.evidence_points) && (
                        <div className="mt-2 space-y-1">
                          {selectedComplaint.image_analysis.evidence_points.slice(0, 3).map((point: string, index: number) => (
                            <p key={index} className="text-[11px]" style={{ color: 'var(--cm-text-muted)' }}>{index + 1}. {point}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <span className="mb-1 block text-[10px] font-mono uppercase tracking-wider" style={{ color: 'var(--cm-text-muted)' }}>Department</span>
                    <div className="flex items-center gap-2">
                      <span>{DEPARTMENT_ICONS[selectedComplaint.department] || '[Dept]'}</span>
                      <span className="text-[13px]" style={{ color: 'var(--cm-text-primary)' }}>{DEPARTMENT_NAMES[selectedComplaint.department] || selectedComplaint.department}</span>
                    </div>
                  </div>

                  <div>
                    <span className="mb-1 block text-[10px] font-mono uppercase tracking-wider" style={{ color: 'var(--cm-text-muted)' }}>Est. Resolution</span>
                    <span className="font-mono text-base font-bold" style={{ color: 'var(--cm-blue)' }}>{selectedComplaint.estimated_resolution_days} days</span>
                  </div>

                  <div className="rounded-lg border-l-2 p-3" style={{ background: 'var(--cm-bg-elevated)', borderLeftColor: 'var(--cm-blue)' }}>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'var(--cm-blue)' }}>Action Notice</span>
                      <button onClick={() => { navigator.clipboard.writeText(selectedComplaint.action_notice || ''); toast.success('Copied!') }} className="rounded p-1 hover:bg-[var(--cm-bg-card)]">
                        <Copy size={12} style={{ color: 'var(--cm-text-muted)' }} />
                      </button>
                    </div>
                    <p className="text-[11px] italic leading-relaxed" style={{ color: 'var(--cm-text-primary)' }}>{selectedComplaint.action_notice}</p>
                  </div>

                  <div className="rounded-lg border p-3" style={{ borderColor: 'var(--cm-border)', background: 'var(--cm-bg-secondary)' }}>
                    <span className="mb-1 block text-center text-[10px] font-mono uppercase tracking-wider" style={{ color: 'var(--cm-text-muted)' }}>Registration Review</span>
                    <div className="scale-[0.85] origin-top">
                      <AgentPipeline />
                    </div>
                  </div>

                  {isAdmin ? (
                    <div>
                      <span className="mb-2 block text-[10px] font-mono uppercase tracking-wider" style={{ color: 'var(--cm-text-muted)' }}>Update Status</span>
                      <div className="grid grid-cols-2 gap-2">
                        {(['Pending', 'In Progress', 'Resolved', 'Rejected'] as const).map(status => (
                          <Button
                            key={status}
                            size="sm"
                            onClick={() => handleStatusUpdate(selectedComplaint.id, status)}
                            disabled={updatingStatus || selectedComplaint.status === status}
                            className="h-7 text-[10px]"
                            style={{
                              background: selectedComplaint.status === status ? `${STATUS_COLORS[status]}30` : 'var(--cm-bg-elevated)',
                              color: selectedComplaint.status === status ? STATUS_COLORS[status] : 'var(--cm-text-secondary)',
                              border: `1px solid ${selectedComplaint.status === status ? `${STATUS_COLORS[status]}40` : 'var(--cm-border)'}`,
                            }}
                          >
                            {status}
                          </Button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="rounded-lg bg-blue-50/50 p-2.5 border border-blue-100/50">
                        <p className="text-[10px] text-blue-600 font-medium">View-only Mode: Status updates restricted.</p>
                      </div>

                      {/* ── Escalation Engine ─────────────────────────── */}
                      {isSLABreached(selectedComplaint) && (
                        <div className="rounded-xl border-2 border-red-200 bg-red-50 p-3">
                          <div className="mb-2 flex items-center gap-2">
                            <ShieldAlert size={14} className="text-red-600" />
                            <div>
                              <p className="text-xs font-bold text-red-700">SLA Deadline Breached</p>
                              <p className="text-[9px] text-red-500">
                                Due by {(() => {
                                  const d = new Date(selectedComplaint.created_at)
                                  d.setDate(d.getDate() + (selectedComplaint.estimated_resolution_days || 7))
                                  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                                })()}
                              </p>
                            </div>
                          </div>
                          <Button
                            className="w-full gap-1.5 bg-red-600 hover:bg-red-700 text-white font-semibold text-[11px] h-8"
                            size="sm"
                            onClick={() => onEscalate && selectedComplaint && onEscalate(selectedComplaint)}
                          >
                            <ShieldAlert size={12} />
                            Report Department
                          </Button>
                        </div>
                      )}
                    </>
                  )}

                  <div className="border-t pt-2 text-[10px] font-mono" style={{ borderColor: 'var(--cm-border)', color: 'var(--cm-text-muted)' }}>
                    Created: {new Date(selectedComplaint.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center m-auto" style={{ color: 'var(--cm-text-muted)' }}>
                <FileText size={32} className="mx-auto mb-3 opacity-40" />
                <p className="text-sm">Select a complaint</p>
              </div>
            )}
        </div>
      </div>
    </div>
  )
}

export default Dashboard
