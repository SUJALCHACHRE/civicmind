import { Complaint, ComplaintFormData, Stats } from '@/types'
import { API_BASE_URL, BHOPAL_WARDS } from './constants'

export async function analyzeComplaint(data: ComplaintFormData): Promise<Complaint> {
  const response = await fetch(`${API_BASE_URL}/complaints/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Analysis failed' }))
    throw new Error(error.error || 'Failed to analyze complaint')
  }

  return response.json()
}

export async function submitComplaint(data: Complaint): Promise<Complaint> {
  const response = await fetch(`${API_BASE_URL}/complaints`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Submission failed' }))
    throw new Error(error.error || 'Failed to submit complaint')
  }

  return response.json()
}

export async function fetchComplaints(filters?: {
  status?: string
  priority?: string
  ward?: string
  user_email?: string
}): Promise<Complaint[]> {
  const params = new URLSearchParams()
  if (filters?.status) params.append('status', filters.status)
  if (filters?.priority) params.append('priority', filters.priority)
  if (filters?.ward) params.append('ward', filters.ward)
  if (filters?.user_email) params.append('user_email', filters.user_email)

  const url = `${API_BASE_URL}/complaints${params.toString() ? '?' + params.toString() : ''}`
  const response = await fetch(url)

  if (!response.ok) throw new Error('Failed to fetch complaints')
  return response.json()
}

export async function fetchComplaint(id: string): Promise<Complaint> {
  const response = await fetch(`${API_BASE_URL}/complaints/${id}`)
  if (!response.ok) throw new Error('Failed to fetch complaint')
  return response.json()
}

export const updateComplaintStatus = async (id: string, status: string): Promise<Complaint> => {
  const response = await fetch(`${API_BASE_URL}/complaints/${id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status }),
  })
  if (!response.ok) {
    throw new Error('Failed to update status')
  }
  return response.json()
}

export async function sendChatMessage(message: string, history: any[], tracking_id?: string, user_email?: string) {
  const response = await fetch(`${API_BASE_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history, tracking_id, user_email }),
  })

  if (!response.ok) throw new Error('Failed to send chat message')
  return response.json()
}

export async function fetchStats(): Promise<Stats> {
  const response = await fetch(`${API_BASE_URL}/stats`)
  if (!response.ok) throw new Error('Failed to fetch stats')
  return response.json()
}

export async function fetchWards() {
  // Use local data as fallback, API endpoint returns the same
  try {
    const response = await fetch(`${API_BASE_URL}/wards`)
    if (response.ok) return response.json()
  } catch {
    // Fallback to local constants
  }
  return BHOPAL_WARDS
}
