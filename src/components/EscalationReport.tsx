import { useRef } from 'react'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import {
  X,
  Download,
  ExternalLink,
  AlertTriangle,
  Building2,
  Calendar,
  MapPin,
  User,
  Phone,
  Clock,
  FileText,
  ShieldAlert,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PRIORITY_COLORS } from '@/lib/constants'
import type { Complaint } from '@/types'
import { toast } from 'sonner'

interface EscalationReportProps {
  complaint: Complaint
  onClose: () => void
}

const DEPT_ESCALATION: Record<string, { officer: string; address: string; email: string }> = {
  'Public Works — Engineering Division': {
    officer: 'Executive Engineer, PWD',
    address: 'Public Works Department, Bhopal Municipal Corporation, BMC Campus, Arera Hills, Bhopal – 462011',
    email: 'pwd@bmconline.gov.in',
  },
  'Public Health & Environment — Sanitation Division': {
    officer: 'Chief Medical Officer / Health Officer',
    address: 'Sanitation Division, Bhopal Municipal Corporation, BMC Campus, Arera Hills, Bhopal – 462011',
    email: 'health@bmconline.gov.in',
  },
  'Jal Pariyojana — Water Supply Division': {
    officer: 'Executive Engineer, Water Supply',
    address: 'Jal Pariyojana Division, Bhopal Municipal Corporation, BMC Campus, Arera Hills, Bhopal – 462011',
    email: 'water@bmconline.gov.in',
  },
  'Power Division — MPMKVVCL / BMC Streetlight Cell': {
    officer: 'Junior Engineer, Electrical Division',
    address: 'Power Division, Bhopal Municipal Corporation, BMC Campus, Arera Hills, Bhopal – 462011',
    email: 'electric@bmconline.gov.in',
  },
  'Planning & Rehabilitation — Encroachment Cell': {
    officer: 'Assistant Commissioner, Urban Planning',
    address: 'Urban Planning Division, Bhopal Municipal Corporation, BMC Campus, Arera Hills, Bhopal – 462011',
    email: 'planning@bmconline.gov.in',
  },
}

const getEscalationInfo = (dept: string) =>
  DEPT_ESCALATION[dept] || {
    officer: 'Municipal Commissioner',
    address: 'Bhopal Municipal Corporation, BMC Campus, Arera Hills, Bhopal – 462011',
    email: 'commoffice@bmconline.gov.in',
  }

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

const getDaysOverdue = (complaint: Complaint) => {
  const registeredAt = new Date(complaint.created_at)
  const deadlineAt = new Date(registeredAt)
  deadlineAt.setDate(deadlineAt.getDate() + (complaint.estimated_resolution_days || 7))
  const diffMs = Date.now() - deadlineAt.getTime()
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
}

export default function EscalationReport({ complaint, onClose }: EscalationReportProps) {
  const reportRef = useRef<HTMLDivElement>(null)
  const escalation = getEscalationInfo(complaint.department)
  const daysOverdue = getDaysOverdue(complaint)
  const deadlineDate = (() => {
    const d = new Date(complaint.created_at)
    d.setDate(d.getDate() + (complaint.estimated_resolution_days || 7))
    return d
  })()

  const todayFormatted = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  const handleDownloadPDF = async () => {
    if (!reportRef.current) return
    toast.loading('Generating PDF report...')
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      })
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width

      let remainingHeight = pdfHeight
      let pageTop = 0
      const pageHeight = pdf.internal.pageSize.getHeight() - 20

      while (remainingHeight > 0) {
        pdf.addImage(imgData, 'PNG', 0, -pageTop + 10, pdfWidth, pdfHeight)
        remainingHeight -= pageHeight
        pageTop += pageHeight
        if (remainingHeight > 0) pdf.addPage()
      }

      pdf.save(`CivicMind_Escalation_${complaint.complaint_number}.pdf`)
      toast.dismiss()
      toast.success('PDF downloaded successfully!')
    } catch {
      toast.dismiss()
      toast.error('Failed to generate PDF.')
    }
  }

  const handleCPGRAM = () => {
    toast('CPGRAM integration is not yet available. This feature will be enabled soon.', {
      icon: '🔗',
    })
  }

  const priorityColor = PRIORITY_COLORS[complaint.priority] || '#3B82F6'
  const imageAnalysis = complaint.image_analysis

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 reveal-rise">
      <div className="mx-auto w-full max-w-3xl shadow-2xl rounded-2xl">
        {/* Header bar */}
        <div className="flex items-center justify-between rounded-t-2xl bg-red-600 px-6 py-4">
          <div className="flex items-center gap-3">
            <ShieldAlert size={22} className="text-white" />
            <div>
              <h2 className="text-base font-bold text-white">Escalation Report</h2>
              <p className="text-xs text-red-100">SLA breach detected – {daysOverdue} day{daysOverdue !== 1 ? 's' : ''} overdue</p>
            </div>
          </div>
          <button onClick={onClose} className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 transition-colors">
            <X size={16} /> Close Report
          </button>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 bg-gray-50 px-6 py-3 border-x border-gray-200">
          <Button
            onClick={handleDownloadPDF}
            className="flex-1 gap-2 bg-gray-900 hover:bg-gray-700 text-white"
          >
            <Download size={15} />
            Download PDF Report
          </Button>
          <Button
            onClick={handleCPGRAM}
            variant="outline"
            className="flex-1 gap-2 border-gray-300 text-gray-600 hover:bg-gray-100"
          >
            <ExternalLink size={15} />
            Report to CPGRAM
          </Button>
        </div>

        {/* THE PRINTABLE REPORT */}
        <div
          ref={reportRef}
          className="rounded-b-2xl border border-gray-200 bg-white p-10 font-serif text-gray-900"
          style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
        >
          {/* Letterhead */}
          <div className="mb-6 border-b-2 border-gray-900 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Formal Escalation Complaint</p>
                <h1 className="mt-1 text-2xl font-bold text-gray-900">Bhopal Municipal Corporation</h1>
                <p className="text-sm text-gray-600">CivicMind – AI-Powered Citizen Grievance System</p>
              </div>
              <div className="text-right text-xs text-gray-500">
                <p className="font-semibold text-gray-700">{todayFormatted}</p>
                <p className="mt-1">Ref: {complaint.complaint_number}</p>
                <span
                  className="mt-2 inline-block rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white"
                  style={{ background: priorityColor }}
                >
                  {complaint.priority} Priority
                </span>
              </div>
            </div>
          </div>

          {/* Addressee */}
          <div className="mb-6">
            <p className="font-semibold">To,</p>
            <p className="font-bold">{escalation.officer}</p>
            <p className="text-sm text-gray-700">{complaint.department}</p>
            <p className="text-sm text-gray-600">{escalation.address}</p>
            <p className="mt-1 text-sm text-gray-600">Email: {complaint.department_email || escalation.email}</p>
          </div>

          {/* Subject */}
          <div className="mb-6 rounded bg-red-50 p-3 border border-red-100">
            <p className="text-sm">
              <strong>Subject:</strong> Escalation of Unresolved Civic Complaint – SLA Breach of {daysOverdue} Day{daysOverdue !== 1 ? 's' : ''} –{' '}
              {complaint.complaint_type} at {complaint.ward}
            </p>
          </div>

          {/* Salutation */}
          <p className="mb-4 text-sm leading-relaxed">
            Respected Sir/Madam,
          </p>
          <p className="mb-6 text-sm leading-relaxed text-gray-800">
            I, <strong>{complaint.citizen_name}</strong>, a resident of{' '}
            <strong>{complaint.ward}, {complaint.zone || 'Bhopal Municipal Corporation Zone'}</strong>, am writing this
            formal escalation letter to bring to your urgent attention that a civic complaint registered with the
            CivicMind AI system under tracking ID <strong>{complaint.complaint_number}</strong> remains <strong>
            unresolved</strong> even after the committed Service Level Agreement (SLA) of{' '}
            <strong>{complaint.estimated_resolution_days} day{complaint.estimated_resolution_days !== 1 ? 's' : ''}</strong>.
            The complaint is now <strong style={{ color: '#DC2626' }}>{daysOverdue} day{daysOverdue !== 1 ? 's' : ''} overdue</strong>.
          </p>

          {/* Complaint Details Table */}
          <div className="mb-6">
            <h2 className="mb-3 border-b border-gray-300 pb-1 text-sm font-bold uppercase tracking-wide">
              Complaint Registration Details
            </h2>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div className="flex items-start gap-2">
                <FileText size={13} className="mt-0.5 shrink-0 text-gray-400" />
                <div>
                  <p className="text-[10px] font-bold uppercase text-gray-400">Tracking ID</p>
                  <p className="font-semibold">{complaint.complaint_number}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Calendar size={13} className="mt-0.5 shrink-0 text-gray-400" />
                <div>
                  <p className="text-[10px] font-bold uppercase text-gray-400">Date Registered</p>
                  <p>{formatDate(complaint.created_at)}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <User size={13} className="mt-0.5 shrink-0 text-gray-400" />
                <div>
                  <p className="text-[10px] font-bold uppercase text-gray-400">Citizen Name</p>
                  <p>{complaint.citizen_name}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Phone size={13} className="mt-0.5 shrink-0 text-gray-400" />
                <div>
                  <p className="text-[10px] font-bold uppercase text-gray-400">Contact</p>
                  <p>{complaint.phone || 'Not provided'}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <MapPin size={13} className="mt-0.5 shrink-0 text-gray-400" />
                <div>
                  <p className="text-[10px] font-bold uppercase text-gray-400">Ward / Zone</p>
                  <p>{complaint.ward} – {complaint.zone || 'N/A'}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Building2 size={13} className="mt-0.5 shrink-0 text-gray-400" />
                <div>
                  <p className="text-[10px] font-bold uppercase text-gray-400">Assigned Department</p>
                  <p>{complaint.department}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <AlertTriangle size={13} className="mt-0.5 shrink-0 text-gray-400" />
                <div>
                  <p className="text-[10px] font-bold uppercase text-gray-400">Issue Category</p>
                  <p>{complaint.complaint_type}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Clock size={13} className="mt-0.5 shrink-0 text-gray-400" />
                <div>
                  <p className="text-[10px] font-bold uppercase text-gray-400">SLA Deadline</p>
                  <p className="font-semibold text-red-600">{formatDate(deadlineDate.toISOString())} (Breached)</p>
                </div>
              </div>
            </div>
          </div>

          {/* Issue Summary */}
          <div className="mb-6">
            <h2 className="mb-3 border-b border-gray-300 pb-1 text-sm font-bold uppercase tracking-wide">
              AI-Generated Issue Summary
            </h2>
            <p className="text-sm leading-relaxed text-gray-800">{complaint.summary}</p>
          </div>

          {/* Original Description */}
          <div className="mb-6">
            <h2 className="mb-3 border-b border-gray-300 pb-1 text-sm font-bold uppercase tracking-wide">
              Citizen's Original Complaint
            </h2>
            <div className="rounded border border-gray-200 bg-gray-50 p-3">
              <p className="text-sm italic leading-relaxed text-gray-700">"{complaint.description}"</p>
            </div>
          </div>

          {/* Image Analysis (if present) */}
          {imageAnalysis && (
            <div className="mb-6">
              <h2 className="mb-3 border-b border-gray-300 pb-1 text-sm font-bold uppercase tracking-wide">
                Photographic Evidence & AI Analysis
              </h2>
              {complaint.attachment_name && (
                <p className="mb-2 text-xs text-gray-500">
                  Attached File: <strong>{complaint.attachment_name}</strong>
                </p>
              )}
              <div className="rounded border border-gray-200 bg-gray-50 p-4">
                {imageAnalysis.visible_issue && (
                  <p className="mb-1 text-sm font-bold text-gray-800">
                    Identified Issue: {imageAnalysis.visible_issue}
                  </p>
                )}
                {imageAnalysis.summary && (
                  <p className="mb-3 text-sm text-gray-700">{imageAnalysis.summary}</p>
                )}
                {imageAnalysis.public_safety_risk && (
                  <p className="mb-2 text-xs text-gray-600">
                    <strong>Public Safety Risk:</strong>{' '}
                    <span
                      className={`font-semibold capitalize ${
                        imageAnalysis.public_safety_risk === 'clear'
                          ? 'text-red-600'
                          : imageAnalysis.public_safety_risk === 'possible'
                          ? 'text-amber-600'
                          : 'text-green-600'
                      }`}
                    >
                      {imageAnalysis.public_safety_risk}
                    </span>
                  </p>
                )}
                {Array.isArray(imageAnalysis.evidence_points) && imageAnalysis.evidence_points.length > 0 && (
                  <div>
                    <p className="mb-1 text-xs font-bold uppercase text-gray-500">Visual Evidence Points:</p>
                    <ul className="list-disc pl-5 text-xs text-gray-700 space-y-0.5">
                      {imageAnalysis.evidence_points.map((pt: string, i: number) => (
                        <li key={i}>{pt}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Priority Reason */}
          <div className="mb-6">
            <h2 className="mb-3 border-b border-gray-300 pb-1 text-sm font-bold uppercase tracking-wide">
              Priority Assessment
            </h2>
            <div className="flex gap-3">
              <span
                className="mt-0.5 shrink-0 h-5 w-1 rounded-full"
                style={{ background: priorityColor }}
              />
              <p className="text-sm leading-relaxed text-gray-800">{complaint.priority_reason}</p>
            </div>
          </div>

          {/* Official Action Notice */}
          <div className="mb-6">
            <h2 className="mb-3 border-b border-gray-300 pb-1 text-sm font-bold uppercase tracking-wide">
              Original Action Notice Issued
            </h2>
            <div className="rounded border-l-4 border-gray-900 bg-gray-50 p-4">
              <p className="text-sm italic leading-relaxed text-gray-800">{complaint.action_notice}</p>
            </div>
          </div>

          {/* Escalation demand */}
          <div className="mb-8 rounded bg-red-50 border border-red-200 p-4">
            <div className="flex gap-2">
              <ShieldAlert size={16} className="mt-0.5 shrink-0 text-red-600" />
              <div className="text-sm leading-relaxed text-gray-800">
                <p>
                  I hereby formally demand that immediate corrective action be taken on the above complaint within the
                  next <strong>72 hours</strong>. Failure to act may compel me to escalate this matter to the{' '}
                  <strong>Deputy Municipal Commissioner</strong>, the{' '}
                  <strong>Municipal Commissioner (Sanskriti Jain, IAS)</strong>, the{' '}
                  <strong>CM Helpline (181)</strong>, and other statutory authorities as applicable under the{' '}
                  <strong>MP Municipal Corporation Act, 1956</strong>.
                </p>
              </div>
            </div>
          </div>

          {/* Signature */}
          <div className="border-t border-gray-200 pt-6">
            <p className="mb-1 text-sm">Yours faithfully,</p>
            <p className="mt-4 text-sm font-bold">{complaint.citizen_name}</p>
            {complaint.phone && <p className="text-xs text-gray-600">Phone: {complaint.phone}</p>}
            <p className="text-xs text-gray-600">Ward: {complaint.ward}</p>
            <p className="mt-2 text-xs text-gray-400">
              This report was generated on {todayFormatted} via CivicMind – Bhopal Municipal Corporation's AI Grievance
              Platform. Tracking ID: {complaint.complaint_number}.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
