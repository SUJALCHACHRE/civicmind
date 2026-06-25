export interface Complaint {
  id: string
  complaint_number: string
  citizen_name: string
  phone?: string
  ward: string
  zone?: string
  description: string
  complaint_type: string
  priority: 'Critical' | 'High' | 'Medium' | 'Low'
  department: string
  sub_department?: string
  estimated_resolution_days: number
  summary: string
  action_notice: string
  priority_reason: string
  department_email?: string
  image_analysis?: any
  attachment_name?: string
  attachment_mime?: string
  agent1_output: any
  agent2_output: any
  agent3_output: any
  status: 'Pending' | 'In Progress' | 'Resolved' | 'Rejected'
  input_method: 'text' | 'voice'
  lat?: number
  lng?: number
  address?: string
  user_email?: string
  created_at: string
  updated_at: string
}

export interface Ward {
  id: number
  name: string
  zone: string
  lat: number
  lng: number
  common_issues: string[]
}

export interface Stats {
  total: number
  by_priority: Array<{ priority: string; count: number }>
  by_department: Array<{ department: string; count: number }>
  by_ward: Array<{ ward: string; count: number }>
  by_status: Array<{ status: string; count: number }>
  by_type: Array<{ complaint_type: string; count: number }>
  avg_resolution_days: number
}

export interface ComplaintFormData {
  citizen_name: string
  phone: string
  ward: string
  description: string
  input_method: 'text' | 'voice'
  lat?: number
  lng?: number
  address?: string
  image_data_url?: string
  attachment_name?: string
  attachment_mime?: string
  user_email?: string
}
