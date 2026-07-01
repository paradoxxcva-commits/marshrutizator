import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { useSettingsStore } from '../../store/settingsStore'
import { useAuthStore } from '../../store/authStore'
import { getCached, isLoading, fetchPhoto, onThumbReady, getAllThumbs } from '../../services/photoService'
import { CATEGORY_ICON_MAP } from '../shared/categoryIcons'
import LocationButton from './LocationButton'
import { useGeolocation } from '../../hooks/useGeolocation'
import type { Place, Reservation } from '../../types'
import { POI_CATEGORY_BY_KEY, type Poi } from './poiCategories'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'

function categoryIconSvg(iconName: string | null | undefined, size: number): string {
  const IconComponent = (iconName && CATEGORY_ICON_MAP[iconName]) || CATEGORY_ICON_MAP['MapPin']
  try {
    return renderToStaticMarkup(createElement(IconComponent, { size, color: 'white', strokeWidth: 2.5 }))
  } catch { return '' }
}

interface RouteSegment {
  mid: [number, number]
  from: [number, number]
  to: [number, number]
}

interface Props {
  places: Place[]
  dayPlaces?: Place[]
  route?: [number, number][][] | null
  routeSegments?: RouteSegment[]
  selectedPlaceId?: number | null
  onMarkerClick?: (id: number) => void
  onMapClick?: (info: { latlng: { lat: number; lng: number } }) => void
  onMapContextMenu?: ((e: { latlng: { lat: number; lng: number }; originalEvent: MouseEvent }) => void) | null
  center?: [number, number]
  zoom?: number
  fitKey?: number | null
  dayOrderMap?: Record<number, number[] | null>
  leftWidth?: number
  rightWidth?: number
  hasInspector?: boolean
  hasDayDetail?: boolean
  reservations?: Reservation[]
  visibleConnectionIds?: number[]
  showReservationStats?: boolean
  onReservationClick?: (reservationId: number) => void
  pois?: Poi[]
  onPoiClick?: (poi: Poi) => void
  onViewportChange?: (bbox: { south: number; west: number; north: number; east: number }) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onMapReady?: (map: any | null) => void
}

// Load Yandex Maps API dynamically
const YANDEX_MAPS_API_KEY = 'd7abe709-90e3-4990-bf1f-3167586698c7'
let yandexMapsLoaded = false
let yandexMapsLoading = false

function loadYandexMaps(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (yandexMapsLoaded) { resolve(); return }
    if (yandexMapsLoading) {
      const check = setInterval(() => {
        if (yandexMapsLoaded) { clearInterval(check); resolve() }
      }, 100)
      return
    }
    yandexMapsLoading = true
    const script = document.createElement('script')
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${YANDEX_MAPS_API_KEY}&lang=ru_RU`
    script.onload = () => {
      ymaps.ready(() => {
        yandexMapsLoaded = true
        resolve()
      })
    }
    script.onerror = reject
    document.head.appendChild(script)
  })
}

export function MapViewYandex({
  places = [],
  dayPlaces = [],
  route = null,
  routeSegments = [],
  selectedPlaceId = null,
  onMarkerClick,
  onMapClick,
  onMapContextMenu = null,
  center = [55.7558, 37.6173],
  zoom = 10,
  fitKey = 0,
  dayOrderMap = {},
  leftWidth = 0,
  rightWidth = 0,
  hasInspector = false,
  hasDayDetail = false,
  reservations = [],
  visibleConnectionIds = [],
  showReservationStats = false,
  onReservationClick,
  pois = [],
  onPoiClick,
  onViewportChange,
  onMapReady,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<Map<number, any>>(new Map())
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>(getAllThumbs)
  const [mapReady, setMapReady] = useState(false)
  const placesPhotosEnabled = useAuthStore(s => s.placesPhotosEnabled)
  const { position: userPosition, mode: trackingMode, cycleMode: cycleTrackingMode, setMode: setTrackingMode } = useGeolocation()
  const onClickRefs = useRef({ marker: onMarkerClick, map: onMapClick, context: onMapContextMenu })
  onClickRefs.current.marker = onMarkerClick
  onClickRefs.current.map = onMapClick
  onClickRefs.current.context = onMapContextMenu
  const onPoiClickRef = useRef(onPoiClick)
  onPoiClickRef.current = onPoiClick
  const onViewportChangeRef = useRef(onViewportChange)
  onViewportChangeRef.current = onViewportChange
  const onMapReadyRef = useRef(onMapReady)
  onMapReadyRef.current = onMapReady

  // Initialize map
  useEffect(() => {
    if (!containerRef.current) return
    let cancelled = false

    loadYandexMaps().then(() => {
      if (cancelled || !containerRef.current) return

      const map = new ymaps.Map(containerRef.current, {
        center: [center[1], center[0]],
        zoom,
        controls: ['zoomControl', 'typeSelector'],
      })

      mapRef.current = map
      onMapReadyRef.current?.(map)

      map.events.add('click', (e: any) => {
        const coords = e.get('coords')
        onClickRefs.current.map?.({ latlng: { lat: coords[0], lng: coords[1] } })
      })

      map.events.add('boundschange', () => {
        const bounds = map.getBounds()
        onViewportChangeRef.current?.({
          south: bounds[0][0],
          west: bounds[0][1],
          north: bounds[1][0],
          east: bounds[1][1],
        })
      })

      setMapReady(true)
    }).catch(console.error)

    return () => {
      cancelled = true
      if (mapRef.current) {
        mapRef.current.destroy()
        mapRef.current = null
      }
      markersRef.current.clear()
      setMapReady(false)
    }
  }, [])

  // Photo loading
  const pendingThumbsRef = useRef<Record<string, string>>({})
  const thumbRafRef = useRef<number | null>(null)
  const placeIds = useMemo(() => places.map(p => p.id).join(','), [places])
  useEffect(() => {
    if (!places || places.length === 0 || !placesPhotosEnabled) return
    const cleanups: (() => void)[] = []
    const setThumb = (cacheKey: string, thumb: string) => {
      pendingThumbsRef.current[cacheKey] = thumb
      if (thumbRafRef.current !== null) return
      thumbRafRef.current = requestAnimationFrame(() => {
        thumbRafRef.current = null
        const pending = pendingThumbsRef.current
        pendingThumbsRef.current = {}
        setPhotoUrls(prev => ({ ...prev, ...pending }))
      })
    }
    for (const place of places) {
      const cacheKey = place.google_place_id || place.osm_id || `${place.lat},${place.lng}`
      if (!cacheKey) continue
      const cached = getCached(cacheKey)
      if (cached?.thumbDataUrl) { setThumb(cacheKey, cached.thumbDataUrl); continue }
      cleanups.push(onThumbReady(cacheKey, thumb => setThumb(cacheKey, thumb)))
      if (!cached && !isLoading(cacheKey)) {
        const photoId = (place.image_url?.startsWith('/api/maps/place-photo/') ? place.image_url : null)
          || place.google_place_id || place.osm_id || place.image_url
        if (photoId || (place.lat && place.lng)) {
          fetchPhoto(cacheKey, photoId || `coords:${place.lat}:${place.lng}`, place.lat, place.lng, place.name)
        }
      }
    }
    return () => { cleanups.forEach(fn => fn()); if (thumbRafRef.current !== null) cancelAnimationFrame(thumbRafRef.current) }
  }, [placeIds, placesPhotosEnabled])

  // Reconcile markers
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return
    const ids = new Set(places.map(p => p.id))
    markersRef.current.forEach((marker, id) => {
      if (!ids.has(id)) { map.geoObjects.remove(marker); markersRef.current.delete(id) }
    })
    places.forEach(place => {
      if (!place.lat || !place.lng) return
      const orderNumbers = dayOrderMap[place.id] ?? null
      const pck = place.google_place_id || place.osm_id || `${place.lat},${place.lng}`
      const photoUrl = (pck && photoUrls[pck]) || place.image_url || null
      const selected = place.id === selectedPlaceId
      const bgColor = place.category_color || '#6b7280'
      const borderColor = selected ? '#111827' : (place.category_color || 'white')

      let badgeHtml = ''
      if (orderNumbers && orderNumbers.length > 0) {
        badgeHtml = `<span style="position:absolute;bottom:-2px;right:-2px;min-width:18px;height:18px;border-radius:9px;padding:0 3px;background:rgba(255,255,255,0.94);border:1.5px solid rgba(0,0,0,0.15);box-shadow:0 1px 4px rgba(0,0,0,0.18);display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:800;color:#111827;font-family:var(--font-system);line-height:1;">${orderNumbers.join(' · ')}</span>`
      }

      const iconHtml = photoUrl
        ? `<div style="width:36px;height:36px;border-radius:50%;border:2.5px solid ${borderColor};box-shadow:0 2px 8px rgba(0,0,0,0.22);overflow:hidden;background:${bgColor};"><img src="${photoUrl}" width="36" height="36" style="display:block;border-radius:50%;object-fit:cover;" /></div>${badgeHtml}`
        : `<div style="width:36px;height:36px;border-radius:50%;border:2.5px solid ${borderColor};box-shadow:0 2px 8px rgba(0,0,0,0.22);background:${bgColor};display:flex;align-items:center;justify-content:center;">${categoryIconSvg(place.category_icon, 15)}</div>${badgeHtml}`

      const icon = ymaps.divIcon({
        html: `<div style="position:relative;width:40px;height:40px;cursor:pointer;">${iconHtml}</div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      })

      const existing = markersRef.current.get(place.id)
      if (existing) map.geoObjects.remove(existing)

      const marker = new ymaps.Placemark([place.lat, place.lng], {
        hintContent: place.name,
      }, {
        iconLayout: 'default#image',
        iconImageHref: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
        iconImageSize: [1, 1],
      })

      // Use placemark with custom icon
      marker.events.add('click', () => {
        onClickRefs.current.marker?.(place.id)
      })

      map.geoObjects.add(marker)
      markersRef.current.set(place.id, marker)
    })
  }, [places, selectedPlaceId, dayOrderMap, photoUrls, mapReady])

  // Fit bounds on fitKey change
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const target = dayPlaces.length > 0 ? dayPlaces : places
    const valid = target.filter(p => p.lat && p.lng)
    if (valid.length === 0) return
    const bounds = valid.map(p => [p.lat!, p.lng!] as [number, number])
    map.setBounds(bounds, { checkZoomRange: true, zoomMargin: 50 })
  }, [fitKey])

  // flyTo selected place
  useEffect(() => {
    const map = mapRef.current
    if (!map || !selectedPlaceId) return
    const target = places.find(p => p.id === selectedPlaceId) || dayPlaces.find(p => p.id === selectedPlaceId)
    if (!target?.lat || !target?.lng) return
    map.panTo([target.lat, target.lng], { flying: true })
  }, [selectedPlaceId])

  // External center/zoom
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    map.setCenter([center[1], center[0]], zoom)
  }, [center[0], center[1]])

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
  const buttonBottom = 'calc(var(--bottom-nav-h, 84px) + 12px)'

  return (
    <div className="w-full h-full relative">
      <div ref={containerRef} className="w-full h-full" />
      {isMobile && (
        <LocationButton
          mode={trackingMode}
          error={null}
          onClick={cycleTrackingMode}
          bottomOffset={buttonBottom as unknown as number}
        />
      )}
    </div>
  )
}
