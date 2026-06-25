import { Ward } from '@/types'

export const BHOPAL_WARDS: Ward[] = [
  { id: 1, name: "Shyamla Hills", zone: "Zone 1", lat: 23.2599, lng: 77.4126, common_issues: ["Road Damage", "Water Leakage"] },
  { id: 2, name: "Arera Colony", zone: "Zone 2", lat: 23.2156, lng: 77.4356, common_issues: ["Pothole", "Garbage"] },
  { id: 3, name: "MP Nagar", zone: "Zone 3", lat: 23.2332, lng: 77.4273, common_issues: ["Streetlight", "Encroachment"] },
  { id: 4, name: "Kolar", zone: "Zone 4", lat: 23.1845, lng: 77.4721, common_issues: ["Water Leakage", "Drainage"] },
  { id: 5, name: "Govindpura", zone: "Zone 5", lat: 23.2701, lng: 77.4589, common_issues: ["Garbage", "Road Damage"] },
  { id: 6, name: "Karond", zone: "Zone 6", lat: 23.2987, lng: 77.3876, common_issues: ["Drainage", "Pothole"] },
  { id: 7, name: "Bairagarh", zone: "Zone 7", lat: 23.2876, lng: 77.3234, common_issues: ["Garbage", "Stray Animals"] },
  { id: 8, name: "Habibganj", zone: "Zone 8", lat: 23.2298, lng: 77.4389, common_issues: ["Pothole", "Streetlight"] },
  { id: 9, name: "New Market", zone: "Zone 9", lat: 23.2287, lng: 77.4041, common_issues: ["Encroachment", "Garbage"] },
  { id: 10, name: "Jahangirabad", zone: "Zone 10", lat: 23.2687, lng: 77.4234, common_issues: ["Water Leakage", "Drainage"] },
  { id: 11, name: "Misrod", zone: "Zone 11", lat: 23.1654, lng: 77.4912, common_issues: ["Road Damage", "Garbage"] },
  { id: 12, name: "Bhanpur", zone: "Zone 12", lat: 23.1456, lng: 77.4678, common_issues: ["Garbage", "Drainage"] },
  { id: 13, name: "Ayodhya Nagar", zone: "Zone 13", lat: 23.2543, lng: 77.3987, common_issues: ["Water Leakage", "Pothole"] },
  { id: 14, name: "Ashoka Garden", zone: "Zone 14", lat: 23.2187, lng: 77.3876, common_issues: ["Stray Animals", "Garbage"] },
  { id: 15, name: "Berasia", zone: "Zone 15", lat: 23.3456, lng: 77.4512, common_issues: ["Road Damage", "Water Leakage"] },
  { id: 16, name: "Ratibad", zone: "Zone 16", lat: 23.1234, lng: 77.4123, common_issues: ["Drainage", "Road Damage"] },
  { id: 17, name: "Bagmugalia", zone: "Zone 17", lat: 23.1987, lng: 77.5012, common_issues: ["Pothole", "Streetlight"] },
  { id: 18, name: "Talaiya", zone: "Zone 18", lat: 23.2654, lng: 77.4098, common_issues: ["Drainage", "Encroachment"] },
  { id: 19, name: "Kotwali", zone: "Zone 19", lat: 23.2589, lng: 77.4021, common_issues: ["Streetlight", "Encroachment"] },
  { id: 20, name: "Huzur", zone: "Zone 20", lat: 23.2012, lng: 77.4534, common_issues: ["Road Damage", "Garbage"] },
  { id: 21, name: "Katara Hills", zone: "Zone 1", lat: 23.1876, lng: 77.4321, common_issues: ["Water Leakage", "Pothole"] },
  { id: 22, name: "Gulmohar", zone: "Zone 2", lat: 23.2234, lng: 77.4423, common_issues: ["Streetlight", "Road Damage"] },
  { id: 23, name: "Nehru Nagar", zone: "Zone 3", lat: 23.2445, lng: 77.4187, common_issues: ["Drainage", "Garbage"] },
  { id: 24, name: "Danish Kunj", zone: "Zone 4", lat: 23.1934, lng: 77.4567, common_issues: ["Stray Animals", "Road Damage"] },
  { id: 25, name: "Salaiya", zone: "Zone 5", lat: 23.2789, lng: 77.4654, common_issues: ["Garbage", "Water Leakage"] },
  { id: 26, name: "Piplani", zone: "Zone 6", lat: 23.2543, lng: 77.4789, common_issues: ["Road Damage", "Streetlight"] },
  { id: 27, name: "Char Imli", zone: "Zone 7", lat: 23.2398, lng: 77.4312, common_issues: ["Encroachment", "Drainage"] },
  { id: 28, name: "Idgah Hills", zone: "Zone 8", lat: 23.2712, lng: 77.4156, common_issues: ["Water Leakage", "Garbage"] },
  { id: 29, name: "Shahpura", zone: "Zone 9", lat: 23.1876, lng: 77.4876, common_issues: ["Pothole", "Drainage"] },
  { id: 30, name: "Trilanga", zone: "Zone 10", lat: 23.2067, lng: 77.4456, common_issues: ["Road Damage", "Water Leakage"] },
]

export const PRIORITY_COLORS: Record<string, string> = {
  Critical: '#EF4444',
  High: '#F59E0B',
  Medium: '#3B82F6',
  Low: '#10B981',
}

export const STATUS_COLORS: Record<string, string> = {
  Pending: '#F59E0B',
  'In Progress': '#3B82F6',
  Resolved: '#10B981',
  Rejected: '#EF4444',
}

export const DEPARTMENT_NAMES: Record<string, string> = {
  PWD: 'Public Works Department',
  Sanitation: 'Sanitation & Solid Waste Management',
  JalPariyojana: 'Jal Pariyojana (Water Board)',
  MPMKVVCL: 'MPMKVVCL (Electricity)',
  Police_BMC: 'Police / BMC Encroachment Cell',
  FireBrigade: 'Fire Brigade & Disaster',
  BMC_General: 'Urban Planning & Parks (BMC General)',
}

export const DEPARTMENT_ICONS: Record<string, string> = {
  PWD: '🛣️',
  Sanitation: '🗑️',
  JalPariyojana: '💧',
  MPMKVVCL: '⚡',
  Police_BMC: '🚔',
  FireBrigade: '🚒',
  BMC_General: '🌳',
}

export const COMPLAINT_TYPE_ICONS: Record<string, string> = {
  'Pothole': '🕳️',
  'Road Damage': '🛣️',
  'Garbage Overflow': '🗑️',
  'Water Leakage': '💧',
  'Pipeline Burst': '🔧',
  'No Water Supply': '🚱',
  'Streetlight Failure': '💡',
  'Exposed Electric Wire': '⚡',
  'Encroachment': '🏗️',
  'Illegal Construction': '🏚️',
  'Drainage Blocked': '🌊',
  'Flooding Risk': '🌧️',
  'Stray Animals': '🐕',
  'Public Nuisance': '🔊',
  'Building Hazard': '⚠️',
  'Other': '📋',
}

export const ZONES = [
  'Zone 1', 'Zone 2', 'Zone 3', 'Zone 4', 'Zone 5',
  'Zone 6', 'Zone 7', 'Zone 8', 'Zone 9', 'Zone 10',
  'Zone 11', 'Zone 12', 'Zone 13', 'Zone 14', 'Zone 15',
  'Zone 16', 'Zone 17', 'Zone 18', 'Zone 19', 'Zone 20',
]

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? '/api'
