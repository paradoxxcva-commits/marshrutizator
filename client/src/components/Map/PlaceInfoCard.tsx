import { useMemo } from 'react'
import { X, MapPin, Phone, Clock, Star, Navigation, Tag, Building2, Map } from 'lucide-react'
import { useDescribePlace } from './useDescribePlace'
import type { Poi } from './poiCategories'

interface Props {
  poi: Poi
  onAdd: () => void
  onClose: () => void
}

const DAY_LABELS: Record<string, string> = {
  mon: 'Пн', tue: 'Вт', wed: 'Ср', thu: 'Чт', fri: 'Пт', sat: 'Сб', sun: 'Вс',
}

const TAG_ICONS: Record<string, typeof Tag> = {
  shopping: Tag, food: Tag, cinema: Tag, parking: Tag, default: Tag,
}

function SkeletonBlock({ height, width, style }: { height?: number; width?: string | number; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: 'linear-gradient(90deg, #2a2a3a 25%, #33334a 50%, #2a2a3a 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.5s infinite',
      borderRadius: 10,
      height: height ?? 16,
      width: width ?? '100%',
      ...style,
    }} />
  )
}

function SkeletonCard() {
  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <SkeletonBlock height={180} style={{ borderRadius: 12 }} />
      <SkeletonBlock height={24} width="70%" />
      <SkeletonBlock height={18} width="35%" style={{ borderRadius: 20 }} />
      <SkeletonBlock height={50} />
      <div style={{ display: 'flex', gap: 10 }}>
        <SkeletonBlock height={60} style={{ flex: 1 }} />
        <SkeletonBlock height={60} style={{ flex: 1 }} />
      </div>
      <SkeletonBlock height={80} />
      <SkeletonBlock height={36} />
    </div>
  )
}

export default function PlaceInfoCard({ poi, onAdd, onClose }: Props) {
  const { data, loading, error } = useDescribePlace(poi.lat, poi.lng)

  // Use webhook data if available, otherwise fall back to OSM data from poi
  const placeData = data ?? {
    name: poi.name,
    type: poi.poi_type || poi.category,
    address: poi.address ?? undefined,
    phone: poi.phone ?? undefined,
  }

  const isOpen = useMemo(() => {
    if (!data?.hours) return null
    const now = new Date()
    const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
    const todayKey = dayKeys[now.getDay()]
    const todayHours = data.hours[todayKey]
    if (!todayHours) return null
    const [oh, om] = todayHours.open.split(':').map(Number)
    const [ch, cm] = todayHours.close.split(':').map(Number)
    const mins = now.getHours() * 60 + now.getMinutes()
    return mins >= oh * 60 + om && mins < ch * 60 + cm
  }, [data])

  const rating = data?.rating
  const reviews = data?.reviews
  const phone = placeData.phone
  const tags = data?.tags ?? []

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      {/* @ts-ignore – suppressPropsWarning */}
      <style>{`@keyframes shimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }`}</style>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 420, maxHeight: '85vh',
          background: '#1e1e2a', borderRadius: 16,
          overflow: 'hidden', display: 'flex', flexDirection: 'column',
          boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 12, right: 12, zIndex: 10,
            background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: '50%',
            width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: '#fff',
          }}
        >
          <X size={16} />
        </button>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {loading ? <SkeletonCard /> : error ? (
            <ErrorState lat={poi.lat} lng={poi.lng} />
          ) : (
            <CardContent
              poi={poi} data={placeData} isOpen={isOpen}
              rating={rating} reviews={reviews} phone={phone} tags={tags}
            />
          )}
        </div>

        {/* Bottom action buttons */}
        {!error && (
          <div style={{ padding: '12px 16px 16px', display: 'flex', gap: 10, borderTop: '1px solid #2a2a3a' }}>
            <a
              href={data?.google_maps || `https://www.google.com/maps?q=${poi.lat},${poi.lng}`}
              target="_blank" rel="noopener noreferrer"
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '12px 0', borderRadius: 12, border: 'none',
                background: '#4285f4', color: '#fff', fontSize: 14, fontWeight: 700,
                textDecoration: 'none', cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              <Navigation size={16} /> Google Maps
            </a>
            <a
              href={data?.yandex_maps || `https://yandex.ru/maps/?pt=${poi.lng},${poi.lat}&z=17&l=map`}
              target="_blank" rel="noopener noreferrer"
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '12px 0', borderRadius: 12, border: 'none',
                background: '#44485a', color: '#fff', fontSize: 14, fontWeight: 700,
                textDecoration: 'none', cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              <Map size={16} /> Яндекс.Карты
            </a>
          </div>
        )}

        {/* Add to trip button */}
        {!error && (
          <div style={{ padding: '0 16px 16px' }}>
            <button
              onClick={onAdd}
              style={{
                width: '100%', padding: '12px 0', borderRadius: 12, border: 'none',
                background: 'linear-gradient(135deg, #c0532b, #e06830)', color: '#fff',
                fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              + В поездку
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function CardContent({ poi, data, isOpen, rating, reviews, phone, tags }: {
  poi: Poi; data: { name?: string; type?: string; address?: string; phone?: string; photo?: string; image?: string; coordinates?: { lat: number; lng: number }; [key: string]: unknown };
  isOpen: boolean | null; rating: number | undefined; reviews: number | undefined;
  phone: string | undefined; tags: string[];
}) {
  const heroImage = data.photo || data.image
  const lat = data.coordinates?.lat ?? poi.lat
  const lng = data.coordinates?.lng ?? poi.lng

  return (
    <>
      {/* Hero image */}
      {heroImage && (
        <div style={{ position: 'relative', width: '100%', height: 200, overflow: 'hidden' }}>
          <img src={heroImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          {/* Overlay chips */}
          <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', gap: 8 }}>
            {data.type && (
              <span style={chipStyle}>
                <Building2 size={13} /> {data.type}
              </span>
            )}
          </div>
          {rating != null && (
            <div style={{ position: 'absolute', top: 12, right: 12 }}>
              <span style={chipStyle}>
                <Star size={13} fill="#facc15" stroke="#facc15" /> {rating.toFixed(1)}
                {reviews != null && <span style={{ color: '#aaa', marginLeft: 4 }}>· {reviews} отзыв</span>}
              </span>
            </div>
          )}
        </div>
      )}

      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Title */}
        <div style={{ fontSize: 20, fontWeight: 700, color: '#fff', lineHeight: 1.3 }}>
          {data?.name || poi.name}
        </div>

        {/* Category badge */}
        {data?.type && (
          <span style={{
            alignSelf: 'flex-start', background: '#3a3a4a', borderRadius: 20,
            padding: '4px 12px', fontSize: 12, color: '#b0b0b0',
          }}>
            {data.type}
          </span>
        )}

        {/* Address */}
        {(data?.address || poi.address) && (
          <div style={sectionStyle}>
            <MapPin size={16} color="#888" style={{ flexShrink: 0, marginTop: 2 }} />
            <span style={{ fontSize: 14, color: '#c0c0c0', lineHeight: 1.4 }}>
              {data?.address || poi.address}
            </span>
          </div>
        )}

        {/* Coordinates + Phone row */}
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ ...sectionStyle, flex: 1, flexDirection: 'column', alignItems: 'flex-start' }}>
            <span style={{ fontSize: 11, color: '#888', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Navigation size={13} /> Координаты
            </span>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginTop: 4 }}>
              {lat.toFixed(4)}, {lng.toFixed(4)}
            </span>
          </div>
          {phone && (
            <div style={{ ...sectionStyle, flex: 1, flexDirection: 'column', alignItems: 'flex-start' }}>
              <span style={{ fontSize: 11, color: '#888', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Phone size={13} /> Телефон
              </span>
              <a href={`tel:${phone}`} style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginTop: 4, textDecoration: 'none' }}>
                {phone}
              </a>
            </div>
          )}
        </div>

        {/* Working hours */}
        {data?.hours && (
          <div style={sectionStyle}>
            <Clock size={16} color="#888" style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: '#888', marginBottom: 8 }}>Часы работы</div>
              {Object.entries(data.hours).map(([day, h]) => (
                <div key={day} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#d0d0d0', marginBottom: 4 }}>
                  <span>{DAY_LABELS[day] || day}</span>
                  <span>{h.open} – {h.close}</span>
                </div>
              ))}
              {isOpen !== null && (
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8,
                  padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                  background: isOpen ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                  color: isOpen ? '#22c55e' : '#ef4444',
                }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: isOpen ? '#22c55e' : '#ef4444',
                  }} />
                  {isOpen ? 'Открыто сейчас' : 'Закрыто'}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Description */}
        {data?.description && (
          <div style={sectionStyle}>
            <span style={{ fontSize: 14, color: '#c8c8d0', lineHeight: 1.6 }}>
              {data.description}
            </span>
          </div>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {tags.map(tag => (
              <span key={tag} style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '4px 10px', borderRadius: 14, fontSize: 12, color: '#e0e0e0',
                background: '#3a3a4a',
              }}>
                <Tag size={12} /> {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

function ErrorState({ lat, lng }: { lat: number; lng: number }) {
  return (
    <div style={{ padding: 32, textAlign: 'center' }}>
      <div style={{ fontSize: 15, color: '#c0c0c0', marginBottom: 20 }}>
        Информация временно недоступна
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <a
          href={`https://www.google.com/maps?q=${lat},${lng}`}
          target="_blank" rel="noopener noreferrer"
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '12px 0', borderRadius: 12, border: 'none',
            background: '#4285f4', color: '#fff', fontSize: 14, fontWeight: 700,
            textDecoration: 'none',
          }}
        >
          <Navigation size={16} /> Google Maps
        </a>
        <a
          href={`https://yandex.ru/maps/?pt=${lng},${lat}&z=17&l=map`}
          target="_blank" rel="noopener noreferrer"
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '12px 0', borderRadius: 12, border: 'none',
            background: '#44485a', color: '#fff', fontSize: 14, fontWeight: 700,
            textDecoration: 'none',
          }}
        >
          <Map size={16} /> Яндекс.Карты
        </a>
      </div>
    </div>
  )
}

const chipStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 5,
  padding: '5px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
  background: 'rgba(0,0,0,0.55)', color: '#fff',
  backdropFilter: 'blur(8px)',
}

const sectionStyle: React.CSSProperties = {
  display: 'flex', gap: 10, padding: 12,
  background: '#2a2a3a', borderRadius: 12,
}
