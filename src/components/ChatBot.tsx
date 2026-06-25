import { useState, useRef, useEffect } from 'react'
import {
  Send, Headphones, User, KeyRound, Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { sendChatMessage } from '@/lib/api'
import gsap from 'gsap'
import type { User as SupabaseUser } from '@supabase/supabase-js'

type Message = {
  role: 'user' | 'assistant'
  content: string
}

interface ChatBotProps {
  user: SupabaseUser | null
}

const ChatBot = ({ user }: ChatBotProps) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hello! I am your CivicMind Assistant. I can help you with BMC policies, officer details, and general municipal inquiries.\n\nIf you have a tracking ID for a complaint, you can provide it to get specific updates."
    }
  ])
  const [inputValue, setInputValue] = useState('')
  const [trackingId, setTrackingId] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [showTrackInput, setShowTrackInput] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (containerRef.current) {
      gsap.fromTo(
        containerRef.current,
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, ease: 'power2.out' }
      )
    }
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  const handleSend = async () => {
    if (!inputValue.trim()) return

    const userMessage = inputValue.trim()
    setInputValue('')

    const updatedMessages: Message[] = [...messages, { role: 'user', content: userMessage }]
    setMessages(updatedMessages)
    setIsTyping(true)

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }))
      const response = await sendChatMessage(
        userMessage,
        history,
        trackingId || undefined,
        user?.email || undefined
      )
      setMessages(prev => [...prev, { role: 'assistant', content: response.reply }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: "I'm having trouble connecting to the BMC servers right now. Please try again later." }])
    } finally {
      setIsTyping(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 h-[calc(100vh-64px)] flex flex-col" ref={containerRef}>

      {/* Header Area */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="font-display text-2xl font-bold" style={{ color: 'var(--cm-text-primary)' }}>
            CivicMind Help Desk
          </h2>
          <p className="text-sm" style={{ color: 'var(--cm-text-muted)' }}>
            AI-powered support for all municipal services
          </p>
        </div>

        <button 
          onClick={() => setShowTrackInput(!showTrackInput)}
          className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 ${
            showTrackInput ? 'bg-[var(--cm-accent)] text-white border-transparent' : 'bg-[var(--cm-bg-card)] text-[var(--cm-text-secondary)] border-[var(--cm-border)]'
          }`}
        >
          <KeyRound size={14} />
          {showTrackInput ? 'Hide Tracking' : 'Add Tracking ID'}
        </button>
      </div>

      {/* Track mode: tracking ID input */}
      {showTrackInput && (
        <div className="mb-4 animate-in fade-in slide-in-from-top-2 flex items-center gap-3 p-3 rounded-2xl border" style={{ borderColor: 'var(--cm-border)', background: 'var(--cm-bg-elevated)' }}>
          <KeyRound size={16} style={{ color: 'var(--cm-accent)' }} />
          <Input
            value={trackingId}
            onChange={(e) => setTrackingId(e.target.value.trim())}
            placeholder="Enter Tracking ID (e.g. CVM-123456)"
            className="flex-1 h-9 bg-transparent border-0 focus-visible:ring-0 px-0 font-mono text-sm placeholder:text-[var(--cm-text-muted)]"
            style={{ color: 'var(--cm-text-primary)' }}
          />
        </div>
      )}

      {/* CHAT AREA */}
      <div
        className="flex-1 rounded-3xl border flex flex-col overflow-hidden shadow-2xl"
        style={{ borderColor: 'var(--cm-border)', background: 'var(--cm-bg-card)' }}
      >
        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex gap-4 max-w-[85%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}>
              <div
                className="w-10 h-10 rounded-2xl flex-shrink-0 flex items-center justify-center border shadow-lg"
                style={{
                  background: msg.role === 'user' ? 'linear-gradient(135deg, var(--cm-accent), var(--cm-blue))' : 'var(--cm-bg-secondary)',
                  borderColor: msg.role === 'user' ? 'transparent' : 'var(--cm-border)',
                  color: msg.role === 'user' ? '#fff' : 'var(--cm-text-muted)'
                }}
              >
                {msg.role === 'user' ? <User size={18} /> : <Headphones size={18} />}
              </div>
              <div
                className={`rounded-2xl px-6 py-4 text-sm leading-relaxed shadow-sm ${
                  msg.role === 'user' ? 'rounded-tr-none' : 'rounded-tl-none border'
                }`}
                style={{
                  background: msg.role === 'user' ? 'rgba(59, 130, 246, 0.08)' : 'rgba(255, 255, 255, 0.4)',
                  borderColor: msg.role === 'user' ? 'rgba(59, 130, 246, 0.2)' : 'var(--cm-border)',
                  color: 'var(--cm-text-primary)'
                }}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex gap-4 max-w-[85%] mr-auto">
              <div className="w-10 h-10 rounded-2xl flex-shrink-0 flex items-center justify-center border bg-[var(--cm-bg-secondary)] border-[var(--cm-border)]">
                <Headphones size={18} style={{ color: 'var(--cm-text-muted)' }} />
              </div>
              <div className="flex items-center gap-1.5 px-6 h-12 bg-white/40 rounded-2xl border border-[var(--cm-border)]">
                <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: 'var(--cm-accent)', animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: 'var(--cm-accent)', animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: 'var(--cm-accent)', animationDelay: '300ms' }} />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-6 border-t" style={{ borderColor: 'var(--cm-border)', background: 'var(--cm-bg-secondary)' }}>
          <div className="relative flex items-center">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about BMC policies or municipal services..."
              disabled={isTyping}
              className="pr-14 h-14 bg-[var(--cm-bg-card)] border-[var(--cm-border)] text-[var(--cm-text-primary)] placeholder:text-[var(--cm-text-muted)] focus-visible:ring-[var(--cm-accent)] rounded-2xl shadow-inner"
            />
            <Button
              onClick={handleSend}
              disabled={isTyping || !inputValue.trim()}
              variant="ghost"
              size="icon"
              className="absolute right-2 w-10 h-10 hover:bg-transparent transition-transform active:scale-95"
              style={{ color: inputValue.trim() ? 'var(--cm-accent-bright)' : 'var(--cm-text-muted)' }}
            >
              <Send size={20} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ChatBot
