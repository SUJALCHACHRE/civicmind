import { useState, useRef, useEffect } from 'react'
import gsap from 'gsap'
import { toast } from 'sonner'
import { Mic, MicOff, Send, Loader2, ChevronDown, MapPin, Check, ShieldCheck, FileSearch, Route, Clock3, Building2, Activity, Layers3, Radio, ImagePlus, X, Camera, RefreshCw } from 'lucide-react'
import { submitComplaint, analyzeComplaint } from '@/lib/api'
import { BHOPAL_WARDS } from '@/lib/constants'
import { Complaint, ComplaintFormData } from '@/types'

interface ComplaintFormProps { onSuccess: (c: Complaint) => void; userEmail: string }

const STAGES = [
  { label: 'Classifying complaint', icon: FileSearch },
  { label: 'Checking priority',     icon: Clock3 },
  { label: 'Routing department',    icon: Route },
]

const ComplaintForm = ({ onSuccess, userEmail }: ComplaintFormProps) => {
  const [form, setForm] = useState<ComplaintFormData>({
    citizen_name: '', phone: '', ward: '', description: '',
    input_method: 'text', address: '', image_data_url: '',
    attachment_name: '', attachment_mime: '', user_email: userEmail,
  })
  const [submitting, setSubmitting]   = useState(false)
  const [stage, setStage]             = useState(0)
  const [listening, setListening]     = useState(false)
  const [wardOpen, setWardOpen]       = useState(false)
  const [preview, setPreview]         = useState<Complaint | null>(null)
  const [confirming, setConfirming]   = useState(false)
  const [fetchingLoc, setFetchingLoc] = useState(false)
  const [cameraOn, setCameraOn]       = useState(false)

  const wrapRef  = useRef<HTMLDivElement>(null)
  const recogRef = useRef<any>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef= useRef<MediaStream | null>(null)

  useEffect(() => {
    gsap.fromTo(wrapRef.current, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out' })
  }, [])

  const startListening = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { toast.error('Voice not supported'); return }
    const r = new SR(); r.lang = 'hi-IN'; r.continuous = false; r.interimResults = true
    r.onresult = (e: any) => setForm(p => ({ ...p, description: Array.from(e.results).map((x: any) => x[0].transcript).join(''), input_method: 'voice' }))
    r.onerror  = () => { toast.error('Voice failed'); setListening(false) }
    r.onend    = () => setListening(false)
    recogRef.current = r; r.start(); setListening(true)
  }
  const stopListening = () => { recogRef.current?.stop(); setListening(false) }

  const fetchLoc = () => {
    if (!navigator.geolocation) { toast.error('Geolocation not supported'); return }
    setFetchingLoc(true)
    navigator.geolocation.getCurrentPosition(
      pos => { setForm(p => ({ ...p, lat: pos.coords.latitude, lng: pos.coords.longitude, address: `${pos.coords.latitude}, ${pos.coords.longitude}` })); toast.success('Location captured'); setFetchingLoc(false) },
      err => { setFetchingLoc(false); toast.error(err.code === err.PERMISSION_DENIED ? 'Location denied' : 'Location failed') },
      { timeout: 10000, enableHighAccuracy: true }
    )
  }

  const uploadImg = (file?: File) => {
    if (!file) return
    if (!file.type.startsWith('image/')) { toast.error('Please attach an image'); return }
    if (file.size > 4 * 1024 * 1024) { toast.error('Image must be < 4 MB'); return }
    const r = new FileReader()
    r.onload = () => setForm(p => ({ ...p, image_data_url: String(r.result || ''), attachment_name: file.name, attachment_mime: file.type }))
    r.onerror = () => toast.error('Failed to read image')
    r.readAsDataURL(file)
    toast.success('Image attached')
  }
  const removeImg = () => setForm(p => ({ ...p, image_data_url: '', attachment_name: '', attachment_mime: '' }))

  const startCam = async () => {
    try { const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false }); streamRef.current = s; if (videoRef.current) videoRef.current.srcObject = s; setCameraOn(true) }
    catch { toast.error('Camera access denied') }
  }
  const stopCam = () => { streamRef.current?.getTracks().forEach(t => t.stop()); streamRef.current = null; setCameraOn(false) }
  const capturePhoto = () => {
    if (!videoRef.current) return
    const c = document.createElement('canvas'); c.width = videoRef.current.videoWidth; c.height = videoRef.current.videoHeight
    c.getContext('2d')?.drawImage(videoRef.current, 0, 0)
    setForm(p => ({ ...p, image_data_url: c.toDataURL('image/jpeg', 0.8), attachment_name: `capture_${Date.now()}.jpg`, attachment_mime: 'image/jpeg' }))
    stopCam(); toast.success('Photo captured')
  }

  const handleSubmit = async () => {
    if (!form.citizen_name.trim()) { toast.error('Enter your name'); return }
    if (!form.ward) { toast.error('Select your ward'); return }
    if (!form.description.trim()) { toast.error('Describe your complaint'); return }
    setSubmitting(true); setStage(0)
    const iv = setInterval(() => setStage(p => p < 2 ? p + 1 : p), 1200)
    try {
      const analyzed = await analyzeComplaint(form); clearInterval(iv); setStage(2)
      await new Promise(r => setTimeout(r, 500)); toast.success('Review complete.'); setPreview(analyzed)
    } catch (e: any) { clearInterval(iv); toast.error(e.message || 'Failed to review') }
    finally { setSubmitting(false); setStage(0) }
  }

  const handleConfirm = async () => {
    if (!preview) return; setConfirming(true)
    try { const res = await submitComplaint(preview); toast.success('Complaint registered!'); onSuccess(res) }
    catch (e: any) { toast.error(e.message || 'Failed to save') }
    finally { setConfirming(false) }
  }

  const wardsByZone = BHOPAL_WARDS.reduce((a, w) => { if (!a[w.zone]) a[w.zone] = []; a[w.zone].push(w); return a }, {} as Record<string, typeof BHOPAL_WARDS>)
  const selWard = BHOPAL_WARDS.find(w => w.name === form.ward)

  const Field = ({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) => (
    <div>
      <label className="section-label mb-2 block">{label}{required && ' *'}</label>
      {children}
    </div>
  )

  return (
    <div className="page-bg">
      <div ref={wrapRef} className="mx-auto max-w-7xl px-4 py-10 sm:px-6">

        {/* Hero banner */}
        <div className="mb-8 overflow-hidden rounded-2xl" style={{ background: '#1A1A1A' }}>
          <div className="grid items-center gap-0 lg:grid-cols-[1fr_340px]">
            <div className="p-8 md:p-10">
              <div className="mb-4 flex items-center gap-2">
                <div className="pulse-dot" />
                <span className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'rgba(242,237,230,0.5)' }}>Bhopal Municipal Corporation</span>
              </div>
              <h2 className="text-3xl font-black leading-tight tracking-tight text-white md:text-4xl">
                Smart civic support<br />for every corner of Bhopal.
              </h2>
              <p className="mt-4 max-w-lg text-sm leading-6" style={{ color: 'rgba(242,237,230,0.55)' }}>
                Submit verified ward, location, and issue details — your complaint gets routed to the right department automatically.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                {[['85 wards', ''], ['99.2% routing', ''], ['3 AI stages', '']].map(([v]) => (
                  <div key={v} className="rounded-full px-4 py-1.5 text-xs font-bold"
                    style={{ background: 'rgba(242,237,230,0.08)', color: 'rgba(242,237,230,0.7)', border: '1px solid rgba(242,237,230,0.12)' }}>
                    {v}
                  </div>
                ))}
              </div>
            </div>
            <div className="hidden border-l p-8 lg:block" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              <div className="mb-4 flex items-center gap-2">
                <Building2 size={14} style={{ color: 'rgba(242,237,230,0.4)' }} />
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(242,237,230,0.4)' }}>Service Standard</span>
              </div>
              {[['Step 01', 'Registered with ward details'], ['Step 02', 'Priority and department reviewed'], ['Step 03', 'Tracking number generated']].map(([step, desc]) => (
                <div key={step} className="flex items-center justify-between border-t py-3" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                  <span className="text-xs" style={{ color: 'rgba(242,237,230,0.5)' }}>{desc}</span>
                  <span className="font-mono text-xs font-bold" style={{ color: 'rgba(242,237,230,0.25)' }}>{step}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Form + Sidebar */}
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">

          {/* Main form */}
          <div className="card-cream-solid p-6 md:p-8">
            <div className="mb-6 flex items-center justify-between border-b pb-5" style={{ borderColor: 'rgba(0,0,0,0.07)' }}>
              <div>
                <h3 className="text-xl font-black tracking-tight" style={{ color: '#1A1A1A' }}>Complaint details</h3>
                <p className="mt-1 text-xs" style={{ color: '#AAA' }}>Fields marked * are required.</p>
              </div>
              <span className="tag" style={{ background: 'rgba(22,163,74,0.08)', color: '#15803D', borderColor: 'rgba(22,163,74,0.2)' }}>
                <ShieldCheck size={10} /> Secure
              </span>
            </div>

            <div className="space-y-5">
              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Full name" required>
                  <input value={form.citizen_name} onChange={e => setForm(p => ({ ...p, citizen_name: e.target.value }))}
                    placeholder="Enter your full name" className="input-cream" disabled={submitting} />
                </Field>
                <Field label="Phone number">
                  <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                    placeholder="+91 XXXXX XXXXX" className="input-cream" disabled={submitting} />
                </Field>
              </div>

              <Field label="Ward *">
                <div className="flex items-center justify-between mb-2">
                  <span />
                  <button type="button" onClick={fetchLoc} disabled={submitting || fetchingLoc}
                    className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-widest transition-all"
                    style={{ borderColor: form.lat ? 'rgba(22,163,74,0.3)' : 'rgba(0,0,0,0.1)', color: form.lat ? '#15803D' : '#888', background: form.lat ? 'rgba(22,163,74,0.06)' : 'transparent' }}>
                    {fetchingLoc ? <Loader2 size={11} className="animate-spin" /> : form.lat ? <Check size={11} /> : <MapPin size={11} />}
                    {fetchingLoc ? 'Fetching…' : form.lat ? 'Captured' : 'Fetch location'}
                  </button>
                </div>
                <div className="relative">
                  <button type="button" onClick={() => !submitting && setWardOpen(!wardOpen)}
                    className="input-cream flex w-full items-center justify-between"
                    style={{ color: form.ward ? '#1A1A1A' : '#AAA' }}>
                    <span>{form.ward ? `${form.ward} (${selWard?.zone})` : 'Select your ward'}</span>
                    <ChevronDown size={14} className={`transition-transform ${wardOpen ? 'rotate-180' : ''}`} style={{ color: '#AAA' }} />
                  </button>
                  {wardOpen && (
                    <div className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border bg-white shadow-lg" style={{ borderColor: 'rgba(0,0,0,0.1)' }}>
                      {Object.entries(wardsByZone).sort().map(([zone, wards]) => (
                        <div key={zone}>
                          <div className="section-label sticky top-0 bg-white px-3 py-2">{zone}</div>
                          {wards.map(w => (
                            <button key={w.id} type="button" onClick={() => { setForm(p => ({ ...p, ward: w.name })); setWardOpen(false) }}
                              className="w-full px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-gray-50"
                              style={{ color: form.ward === w.name ? '#1A1A1A' : '#555', background: form.ward === w.name ? 'rgba(0,0,0,0.04)' : undefined }}>
                              {w.name}
                            </button>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Field>

              <Field label="Address or coordinates">
                <textarea value={form.address || ''} onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
                  placeholder="Fetch location above or type the address." rows={2}
                  className="input-cream resize-none" disabled={submitting} />
              </Field>

              {/* Evidence */}
              <Field label="Attach evidence (optional)">
                {form.image_data_url ? (
                  <div className="flex items-center gap-4 rounded-xl border p-3" style={{ borderColor: 'rgba(0,0,0,0.09)' }}>
                    <img src={form.image_data_url} alt="evidence" className="h-20 w-24 rounded-lg object-cover" />
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-xs font-semibold" style={{ color: '#1A1A1A' }}>{form.attachment_name}</p>
                      <p className="mt-1 text-xs" style={{ color: '#888' }}>AI will analyze this for routing.</p>
                    </div>
                    <button type="button" onClick={removeImg} disabled={submitting}
                      className="btn-outline-ink px-3 py-1.5 text-[10px]"><X size={11} /> Remove</button>
                  </div>
                ) : cameraOn ? (
                  <div className="relative overflow-hidden rounded-xl border-2 bg-black" style={{ borderColor: '#1A1A1A' }}>
                    <video ref={videoRef} autoPlay playsInline className="h-64 w-full object-cover" />
                    <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-4">
                      <button type="button" onClick={stopCam} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm"><X size={18} /></button>
                      <button type="button" onClick={capturePhoto} className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-lg"><div className="h-9 w-9 rounded-full border-2 border-black/10" /></button>
                      <button type="button" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm"><RefreshCw size={16} /></button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed transition-all hover:bg-white"
                      style={{ borderColor: 'rgba(0,0,0,0.13)' }}>
                      <ImagePlus size={20} style={{ color: '#888' }} />
                      <span className="mt-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: '#888' }}>Upload File</span>
                      <input type="file" accept="image/*" className="sr-only" disabled={submitting} onChange={e => uploadImg(e.target.files?.[0])} />
                    </label>
                    <button type="button" onClick={startCam} disabled={submitting}
                      className="flex min-h-28 flex-col items-center justify-center rounded-xl border border-dashed transition-all hover:bg-white"
                      style={{ borderColor: 'rgba(0,0,0,0.13)' }}>
                      <Camera size={20} style={{ color: '#888' }} />
                      <span className="mt-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: '#888' }}>Take Photo</span>
                    </button>
                  </div>
                )}
              </Field>

              {/* Description */}
              <Field label="Description *">
                <div className="mb-2 flex items-center justify-between">
                  <span />
                  <button type="button" onClick={listening ? stopListening : startListening} disabled={submitting}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-widest transition-all ${listening ? 'voice-recording' : ''}`}
                    style={{ borderColor: listening ? 'rgba(220,38,38,0.3)' : 'rgba(0,0,0,0.1)', color: listening ? '#B91C1C' : '#888', background: listening ? 'rgba(220,38,38,0.06)' : 'transparent' }}>
                    {listening ? <MicOff size={11} /> : <Mic size={11} />}
                    {listening ? 'Listening…' : 'Voice'}
                  </button>
                </div>
                <div className="relative">
                  <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value, input_method: 'text' }))}
                    placeholder="Describe the civic issue in Hindi or English." rows={6} maxLength={1000}
                    className="input-cream resize-none pb-6" disabled={submitting} />
                  <span className="absolute bottom-2 right-3 text-[10px]" style={{ color: '#CCC' }}>{form.description.length}/1000</span>
                </div>
              </Field>

              {/* Submit */}
              {submitting ? (
                <div className="space-y-2">
                  {STAGES.map((s, i) => {
                    const Icon = s.icon; const active = i === stage; const done = i < stage
                    return (
                      <div key={s.label} className="flex items-center gap-3 rounded-xl border p-3 transition-all"
                        style={{ borderColor: active || done ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.07)', background: active || done ? 'rgba(0,0,0,0.04)' : 'transparent', opacity: active || done ? 1 : 0.4 }}>
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: 'rgba(0,0,0,0.06)' }}>
                          <Icon size={14} style={{ color: '#1A1A1A' }} />
                        </div>
                        <span className="flex-1 text-xs font-semibold" style={{ color: '#1A1A1A' }}>{s.label}</span>
                        {done ? <Check size={14} style={{ color: '#15803D' }} /> : active ? <Loader2 size={14} className="animate-spin" style={{ color: '#1A1A1A' }} /> : null}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <button onClick={handleSubmit} className="btn-ink w-full py-3.5">
                  <Send size={14} /> Review and submit
                </button>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <aside className="space-y-4">
            <div className="card-cream-solid p-5">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: '#1A1A1A' }}>
                  <Radio size={13} color="#F2EDE6" />
                </div>
                <div>
                  <p className="text-xs font-bold" style={{ color: '#1A1A1A' }}>Live registration flow</p>
                  <p className="text-[10px]" style={{ color: '#AAA' }}>What happens next</p>
                </div>
              </div>
              <div className="space-y-4">
                {STAGES.map((s, i) => {
                  const Icon = s.icon
                  return (
                    <div key={s.label} className="group flex gap-3">
                      {i < STAGES.length - 1 && <div className="absolute ml-3.5 mt-8 h-6 w-px" style={{ background: 'rgba(0,0,0,0.1)' }} />}
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-transform group-hover:scale-110" style={{ borderColor: 'rgba(0,0,0,0.09)', background: '#fff' }}>
                        <Icon size={13} style={{ color: '#555' }} />
                      </div>
                      <div>
                        <p className="text-xs font-semibold" style={{ color: '#1A1A1A' }}>{s.label}</p>
                        <p className="text-[10px]" style={{ color: '#AAA' }}>Step {i + 1}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="card-ink p-5">
              <p className="section-label mb-1" style={{ color: 'rgba(242,237,230,0.4)' }}>Helpline</p>
              <p className="text-2xl font-black tracking-tight text-white">155304</p>
              <p className="mt-2 text-xs" style={{ color: 'rgba(242,237,230,0.45)' }}>BMC public complaint support</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[{ Icon: Activity, label: 'Active', sub: 'Intake status', color: '#15803D' }, { Icon: Layers3, label: 'Mapped', sub: 'Ward routing', color: '#1D4ED8' }].map(({ Icon, label, sub, color }) => (
                <div key={label} className="card-cream-solid p-4">
                  <Icon size={14} style={{ color }} />
                  <p className="mt-3 text-base font-black" style={{ color: '#1A1A1A' }}>{label}</p>
                  <p className="text-[10px]" style={{ color: '#AAA' }}>{sub}</p>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>

      {/* Confirm modal */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.09)', boxShadow: '0 30px 80px rgba(0,0,0,0.15)' }}>
            <div className="border-b p-6" style={{ borderColor: 'rgba(0,0,0,0.07)' }}>
              <h3 className="text-lg font-black" style={{ color: '#1A1A1A' }}>Review final details</h3>
              <p className="mt-1 text-xs" style={{ color: '#AAA' }}>Confirm before saving.</p>
            </div>
            <div className="space-y-4 p-6">
              <div className="rounded-xl border p-3" style={{ borderColor: 'rgba(0,0,0,0.09)', background: '#F9F7F4' }}>
                <p className="section-label mb-1">Tracking ID</p>
                <p className="font-mono text-xl font-black" style={{ color: '#1A1A1A' }}>{preview.complaint_number}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 text-xs">
                {[['Name', preview.citizen_name], ['Mobile', preview.phone || 'N/A'], ['Ward', preview.ward], ['Zone', preview.zone]].map(([k, v]) => (
                  <div key={k}><p className="section-label mb-1">{k}</p><p className="font-medium" style={{ color: '#1A1A1A' }}>{v}</p></div>
                ))}
              </div>
              <div className="rounded-xl border p-3" style={{ borderColor: 'rgba(0,0,0,0.09)' }}>
                <p className="section-label mb-1">Assigned department</p>
                <p className="text-sm font-semibold" style={{ color: '#1A1A1A' }}>{preview.department}</p>
                {preview.sub_department && <p className="text-xs" style={{ color: '#888' }}>{preview.sub_department}</p>}
                {preview.department_email && <p className="font-mono text-[10px] mt-2" style={{ color: '#AAA' }}>{preview.department_email}</p>}
              </div>
            </div>
            <div className="flex gap-3 border-t p-4" style={{ borderColor: 'rgba(0,0,0,0.07)' }}>
              <button onClick={() => setPreview(null)} disabled={confirming} className="btn-outline-ink flex-1 py-2.5">Cancel</button>
              <button onClick={handleConfirm} disabled={confirming} className="btn-ink flex-1 py-2.5">
                {confirming ? <Loader2 size={14} className="animate-spin" /> : null} Confirm & register
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ComplaintForm
