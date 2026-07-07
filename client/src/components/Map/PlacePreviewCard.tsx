import { useMemo } from 'react'
import { X, Plus, Navigation, Globe, Phone, Clock, Star } from 'lucide-react'
import { usePlaceDetails } from '../shared/usePlaceDetails'
import { CATEGORY_ICON_MAP } from '../shared/categoryIcons'
import { POI_CATEGORY_BY_KEY, type Poi } from './poiCategories'

interface Props {
  poi: Poi
  onAdd: () => void
  onClose: () => void
}

export default function PlacePreviewCard({ poi, onAdd, onClose }: Props) {
  const details = usePlaceDetails(undefined, poi.osm_id, 'ru')
  const cat = POI_CATEGORY_BY_KEY[poi.category]
  const CatIcon = cat ? CATEGORY_ICON_MAP[cat.key] || CATEGORY_ICON_MAP['MapPin'] : CATEGORY_ICON_MAP['MapPin']

  const rating = (details as any)?.rating
  const ratingCount = (details as any)?.rating_count
  const hours = (details as any)?.opening_hours
  const phone = poi.phone || (details as any)?.phone
  const website = poi.website || (details as any)?.website
  const summary = (details as any)?.summary

  const hoursText = useMemo(() => {
    if (!hours) return null
    if (typeof hours === 'string') return hours
    if (Array.isArray(hours)) return hours.join(', ')
    if (hours.text) return hours.text
    return null
  }, [hours])

  const cardStyle: React.CSSProperties = {
    position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
    zIndex: 200, width: 'min(360px, calc(100vw - 32px))',
    background: 'var(--bg-card)', borderRadius: 16,
    boxShadow: '0 8px 32px rgba(0,0,0,0.18)', overflow: 'hidden',
    border: '1px solid var(--border-primary)',
    fontFamily: 'var(--font-system)',
  }

  const headerStyle: React.CSSProperties = {
    padding: '14px 16px 10px', display: 'flex', alignItems: 'flex-start', gap: 12,
  }

  return (
    <div style={cardStyle}>
      {/* Header: icon + name + close */}
      <div style={headerStyle}>
        <div style={{
          width: 40, height: 40, borderRadius: 12, flexShrink: 0,
          background: cat ? `${cat.color}18` : 'var(--bg-tertiary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <CatIcon size={20} color={cat?.color || 'var(--text-muted)'} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3 }}>
            {poi.name}
          </div>
          {poi.address && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.3,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {poi.address}
            </div>
          )}
        </div>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', padding: 4, cursor: 'pointer',
          color: 'var(--text-faint)', flexShrink: 0, borderRadius: 6,
        }}>
          <X size={16} />
        </button>
      </div>

      {/* Details row */}
      <div style={{ padding: '0 16px 12px', display: 'flex', flexWrap: 'wrap', gap: '6px 14px', fontSize: 12, color: 'var(--text-secondary)' }}>
        {rating != null && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Star size={12} fill="#f59e0b" stroke="#f59e0b" />
            {rating.toFixed(1)}
            {ratingCount != null && <span style={{ color: 'var(--text-faint)' }}>({ratingCount})</span>}
          </span>
        )}
        {cat && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <CatIcon size={11} color={cat.color} />
            {poi.category}
          </span>
        )}
        {hoursText && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Clock size={11} />
            {hoursText.length > 40 ? hoursText.slice(0, 40) + '…' : hoursText}
          </span>
        )}
      </div>

      {/* Summary */}
      {summary && (
        <div style={{ padding: '0 16px 12px', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {summary}
        </div>
      )}

      {/* Action row */}
      <div style={{ padding: '0 16px 14px', display: 'flex', gap: 8 }}>
        {website && (
          <a href={website} target="_blank" rel="noopener noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 12px',
              borderRadius: 8, border: '1px solid var(--border-primary)', background: 'transparent',
              color: 'var(--text-secondary)', fontSize: 12, textDecoration: 'none', cursor: 'pointer' }}>
            <Globe size={12} /> Сайт
          </a>
        )}
        {phone && (
          <a href={`tel:${phone}`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 12px',
              borderRadius: 8, border: '1px solid var(--border-primary)', background: 'transparent',
              color: 'var(--text-secondary)', fontSize: 12, textDecoration: 'none', cursor: 'pointer' }}>
            <Phone size={12} /> Позвонить
          </a>
        )}
        <a href={poi.google_maps_url || `https://www.google.com/maps/search/?api=1&query=${poi.lat},${poi.lng}`}
          target="_blank" rel="noopener noreferrer"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 12px',
            borderRadius: 8, border: '1px solid var(--border-primary)', background: 'transparent',
            color: 'var(--text-secondary)', fontSize: 12, textDecoration: 'none', cursor: 'pointer' }}>
          <Navigation size={12} /> Google Maps
        </a>
        <div style={{ flex: 1 }} />
        <button onClick={onAdd} style={{
          display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 14px',
          borderRadius: 8, border: 'none', background: 'var(--accent)', color: 'var(--accent-text)',
          fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
        }}>
          <Plus size={13} /> В поездку
        </button>
      </div>
    </div>
  )
}
