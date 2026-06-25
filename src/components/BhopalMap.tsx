import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from 'react-leaflet'
import { BHOPAL_WARDS, PRIORITY_COLORS } from '@/lib/constants'
import { Complaint } from '@/types'
import 'leaflet/dist/leaflet.css'

interface BhopalMapProps {
  complaints: Complaint[]
  onWardClick?: (ward: string) => void
}

type GeocodedComplaint = Complaint & {
  lat: number
  lng: number
}

// Fix default marker icon issue in react-leaflet
const MapInitializer = () => {
  const map = useMap()
  useEffect(() => {
    setTimeout(() => {
      map.invalidateSize()
    }, 100)
  }, [map])
  return null
}

const BhopalMap = ({ complaints, onWardClick }: BhopalMapProps) => {
  const mapRef = useRef<any>(null)
  const geocodedComplaints = complaints.filter(
    (c): c is GeocodedComplaint => typeof c.lat === 'number'
      && Number.isFinite(c.lat)
      && typeof c.lng === 'number'
      && Number.isFinite(c.lng)
  )

  // Compute ward stats
  const wardStats = BHOPAL_WARDS.map(ward => {
    const wardComplaints = complaints.filter(c => c.ward === ward.name)
    const count = wardComplaints.length
    const hasCritical = wardComplaints.some(c => c.priority === 'Critical')
    const hasHigh = wardComplaints.some(c => c.priority === 'High')
    const topType = wardComplaints.length > 0
      ? Object.entries(
          wardComplaints.reduce((acc, c) => {
            acc[c.complaint_type] = (acc[c.complaint_type] || 0) + 1
            return acc
          }, {} as Record<string, number>)
        ).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'
      : ward.common_issues[0] || 'N/A'

    let color = '#3B82F6'
    if (hasCritical) color = PRIORITY_COLORS.Critical
    else if (hasHigh) color = PRIORITY_COLORS.High

    return { ...ward, count, color, topType }
  })

  return (
    <div className="w-full h-full rounded-lg overflow-hidden border"
      style={{ borderColor: 'var(--cm-border)', minHeight: '400px' }}>
      <MapContainer
        ref={mapRef}
        center={[23.2599, 77.4126]}
        zoom={12}
        style={{ width: '100%', height: '100%', minHeight: '400px', background: '#f8fafc' }}
        zoomControl={true}
        attributionControl={true}
      >
        <MapInitializer />
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        {wardStats.map(ward => (
          <CircleMarker
            key={ward.id}
            center={[ward.lat, ward.lng]}
            radius={ward.count > 0 ? Math.max(8, ward.count * 3) : 6}
            pathOptions={{
              fillColor: ward.count > 0 ? ward.color : '#4A5560',
              fillOpacity: ward.count > 0 ? 0.6 : 0.2,
              color: ward.count > 0 ? ward.color : '#4A5560',
              weight: 2,
              opacity: ward.count > 0 ? 0.8 : 0.3,
            }}
            eventHandlers={{
              click: () => onWardClick?.(ward.name),
            }}
          >
            <Tooltip>
              <div style={{ fontFamily: 'Inter, sans-serif' }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{ward.name}</div>
                <div style={{ fontSize: 12, color: '#8A95A0' }}>{ward.zone}</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>
                  Complaints: <strong style={{ color: ward.color }}>{ward.count}</strong>
                </div>
                <div style={{ fontSize: 11, color: '#8A95A0', marginTop: 2 }}>
                  Top Issue: {ward.topType}
                </div>
              </div>
            </Tooltip>
          </CircleMarker>
        ))}
        {/* Render precise individual complaints */}
        {geocodedComplaints.map(c => (
          <CircleMarker
            key={`cmp-${c.id}`}
            center={[c.lat, c.lng]}
            radius={5}
            pathOptions={{
              fillColor: PRIORITY_COLORS[c.priority] || '#3B82F6',
              fillOpacity: 0.9,
              color: '#ffffff',
              weight: 1,
              opacity: 1,
            }}
            eventHandlers={{
              click: () => onWardClick?.(c.ward),
            }}
          >
            <Tooltip>
              <div style={{ fontFamily: 'Inter, sans-serif' }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{c.complaint_type}</div>
                <div style={{ fontSize: 12, color: '#8A95A0' }}>{c.complaint_number}</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>
                  Priority: <strong style={{ color: PRIORITY_COLORS[c.priority] || '#3B82F6' }}>{c.priority}</strong>
                </div>
                <div style={{ fontSize: 11, color: '#8A95A0', marginTop: 2, maxWidth: '200px', whiteSpace: 'normal' }}>
                  {c.summary}
                </div>
              </div>
            </Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  )
}

export default BhopalMap
