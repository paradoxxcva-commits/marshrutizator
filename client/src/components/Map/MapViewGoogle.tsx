import { useEffect, useRef } from 'react'
import { renderToStaticMarkup, createElement } from 'react-dom/server'
import { useSettingsStore } from '../../store/settingsStore'
import { useAuthStore } from '../../store/authStore'
import { POI_CATEGORY_BY_KEY, type Poi } from './poiCategories'
import { buildPlacePopupHtml, buildPoiPopupHtml } from './placePopup'
import type { Place, Reservation } from '../../types'

declare global {
  interface Window {
    google?: { maps?: any }
    __googleMapsPromise?: Promise<void>
  }
}

// ── Script loader ────────────────────────────────────────────────────────────
function loadGoogleMapsScript(apiKey: string): Promise<void> {
  if (window.google?.maps) return Promise.resolve()
  if (window.__googleMapsPromise) return window.__googleMapsPromise
  window.__googleMapsPromise = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById('google-maps-script')
    if (existing) {
      const check = setInterval(() => { if (window.google?.maps) { clearInterval(check); resolve() } }, 100)
      setTimeout(() => { clearInterval(check); reject(new Error('Google Maps load timeout')) }, 15000)
      return
    }
    const script = document.createElement('script')
    script.id = 'google-maps-script'
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places&language=ru`
    script.async = true; script.defer = true
    script.onload = () => {
      const check = setInterval(() => { if (window.google?.maps) { clearInterval(check); resolve() } }, 100)
      setTimeout(() => { clearInterval(check); reject(new Error('Google Maps init timeout')) }, 15000)
    }
    script.onerror = () => reject(new Error('Failed to load Google Maps script'))
    document.head.appendChild(script)
  })
  return window.__googleMapsPromise
}

// ── Module-level icon builders (survive Rolldown) ────────────────────────────
function placeIcon(place: Place, selected: boolean, order: number | null) {
  const g = window.google!.maps
  const color = selected ? '#ef4444' : (place.category_color || '#3b82f6')
  const s = selected ? 1.4 : 1
  return {
    path: g.SymbolPath.CIRCLE, scale: 9 * s,
    fillColor: color, fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2.5,
    label: order != null ? { text: String(order), color: '#fff', fontSize: '11px', fontWeight: 'bold' } : undefined,
  }
}

function poiIcon(category: string, border: string = '#fff') {
  const g = window.google!.maps
  const cat = POI_CATEGORY_BY_KEY[category]
  return {
    path: g.SymbolPath.CIRCLE, scale: 8,
    fillColor: cat?.color || '#6b7280', fillOpacity: 1,
    strokeColor: border, strokeWeight: 2.5,
  }
}

// ── Props ────────────────────────────────────────────────────────────────────
interface Props {
  places: Place[]
  dayPlaces?: Place[]
  route?: [number, number][][] | null
  routeSegments?: { coordinates: [number, number][]; mode?: string }[]
  selectedPlaceId?: number | null
  onMarkerClick?: (id: number) => void
  onMapClick?: (e: any) => void
  onMapContextMenu?: ((e: any) => void) | null
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
  googlePois?: Poi[]
  onPoiClick?: (poi: Poi) => void
  onViewportChange?: (bbox: { south: number; west: number; north: number; east: number }) => void
  onMapReady?: (map: any | null) => void
}

// ── Component ────────────────────────────────────────────────────────────────
export function MapViewGoogle({
  places = [], dayPlaces = [], route = null, routeSegments = [],
  selectedPlaceId = null, onMarkerClick, onMapClick, onMapContextMenu = null,
  center = [55.7558, 37.6173], zoom = 10, fitKey = 0, dayOrderMap = {},
  leftWidth = 0, rightWidth = 0, hasInspector = false, hasDayDetail = false,
  reservations = [], visibleConnectionIds = [], showReservationStats = false,
  onReservationClick, pois = [], googlePois = [], onPoiClick, onViewportChange, onMapReady,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const markersRef = useRef<Map<number, any>>(new Map())
  const poiMarkersRef = useRef<any[]>([])
  const googlePoiMarkersRef = useRef<any[]>([])
  const routeLinesRef = useRef<any[]>([])
  const iwRef = useRef<any>(null) // InfoWindow

  // Callback refs to avoid stale closures
  const cbRef = useRef({ onMapClick, onMapContextMenu, onPoiClick, onMarkerClick, onViewportChange, onMapReady })
  cbRef.current = { onMapClick, onMapContextMenu, onPoiClick, onMarkerClick, onViewportChange, onMapReady }

  const apiKey = useAuthStore(s => s.user?.maps_api_key || '')
  const mapType = useSettingsStore(s => s.settings.google_map_type || 'roadmap')

  // ── Init ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || !apiKey) return
    let cancelled = false
    loadGoogleMapsScript(apiKey).then(() => {
      if (cancelled || !containerRef.current || !window.google?.maps) return
      const g = window.google.maps
      const map = new g.Map(containerRef.current, {
        center: { lat: center[0], lng: center[1] }, zoom,
        mapTypeControl: false, streetViewControl: false, fullscreenControl: false,
        zoomControl: true, language: 'ru',
        styles: [{ featureType: 'poi', stylers: [{ visibility: 'off' }] }],
      })
      map.addListener('click', (e: any) => cbRef.current.onMapClick?.(e))
      map.addListener('contextmenu', (e: any) => cbRef.current.onMapContextMenu?.(e))
      map.addListener('idle', () => {
        if (!cbRef.current.onViewportChange) return
        const b = map.getBounds(); if (!b) return
        const ne = b.getNorthEast(), sw = b.getSouthWest()
        cbRef.current.onViewportChange({ north: ne.lat(), east: ne.lng(), south: sw.lat(), west: sw.lng() })
      })
      mapRef.current = map
      iwRef.current = new g.InfoWindow()
      cbRef.current.onMapReady?.(map)
    }).catch(err => console.error('Google Maps failed:', err))
    return () => { cancelled = true; cbRef.current.onMapReady?.(null) }
  }, [apiKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Map type ──────────────────────────────────────────────────────────
  useEffect(() => { mapRef.current?.setMapType(mapType) }, [mapType])

  // ── Fit bounds ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !window.google?.maps) return
    const all = [...places, ...dayPlaces].filter(p => p.lat && p.lng)
    if (all.length > 0) {
      const b = new window.google.maps.LatLngBounds()
      all.forEach(p => b.extend({ lat: p.lat!, lng: p.lng! }))
      mapRef.current.fitBounds(b, { top: 60, bottom: hasInspector ? 320 : hasDayDetail ? 280 : 60, left: leftWidth + 40, right: rightWidth + 40 })
    } else {
      mapRef.current.setCenter({ lat: center[0], lng: center[1] })
      mapRef.current.setZoom(zoom)
    }
  }, [fitKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Place markers ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !window.google?.maps) return
    markersRef.current.forEach(m => m.setMap(null)); markersRef.current.clear()
    for (const p of places) {
      if (!p.lat || !p.lng) continue
      const sel = p.id === selectedPlaceId
      const mk = new window.google.maps.Marker({
        position: { lat: p.lat, lng: p.lng }, map, title: p.name,
        icon: placeIcon(p, sel, dayOrderMap[p.id]?.[0] ?? null),
        zIndex: sel ? 1000 : 0,
      })
      mk.addListener('click', () => cbRef.current.onMarkerClick?.(p.id))
      mk.addListener('mouseover', () => { iwRef.current.setContent(buildPlacePopupHtml(p as any, null)); iwRef.current.open({ anchor: mk, map, shouldFocus: false }) })
      mk.addListener('mouseout', () => iwRef.current?.close())
      markersRef.current.set(p.id, mk)
    }
  }, [places, selectedPlaceId, dayOrderMap]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── OSM POI markers ──────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !window.google?.maps) return
    poiMarkersRef.current.forEach(m => m.setMap(null)); poiMarkersRef.current = []
    for (const poi of pois) {
      const mk = new window.google.maps.Marker({
        position: { lat: poi.lat, lng: poi.lng }, map, title: poi.name,
        icon: poiIcon(poi.category), zIndex: 500,
      })
      mk.addListener('mouseover', () => { iwRef.current.setContent(buildPoiPopupHtml(poi)); iwRef.current.open({ anchor: mk, map, shouldFocus: false }) })
      mk.addListener('mouseout', () => iwRef.current?.close())
      mk.addListener('click', () => cbRef.current.onPoiClick?.(poi))
      poiMarkersRef.current.push(mk)
    }
  }, [pois]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Google POI markers ────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !window.google?.maps) return
    googlePoiMarkersRef.current.forEach(m => m.setMap(null)); googlePoiMarkersRef.current = []
    for (const poi of googlePois) {
      const mk = new window.google.maps.Marker({
        position: { lat: poi.lat, lng: poi.lng }, map, title: poi.name,
        icon: poiIcon(poi.category, '#4285F4'), zIndex: 500,
      })
      mk.addListener('mouseover', () => { iwRef.current.setContent(buildPoiPopupHtml(poi)); iwRef.current.open({ anchor: mk, map, shouldFocus: false }) })
      mk.addListener('mouseout', () => iwRef.current?.close())
      mk.addListener('click', () => cbRef.current.onPoiClick?.(poi))
      googlePoiMarkersRef.current.push(mk)
    }
  }, [googlePois]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Route lines ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !window.google?.maps) return
    routeLinesRef.current.forEach(l => l.setMap(null)); routeLinesRef.current = []
    if (!route || route.length === 0) return
    const g = window.google.maps
    for (const seg of route) {
      if (!seg || seg.length < 2) continue
      const path = seg.map(([lat, lng]) => ({ lat, lng }))
      routeLinesRef.current.push(
        new g.Polyline({ path, geodesic: true, strokeColor: '#0a5cc2', strokeOpacity: 1, strokeWeight: 8, map, clickable: false, strokeLinecap: 'round', strokeLinejoin: 'round' }),
        new g.Polyline({ path, geodesic: true, strokeColor: '#0a84ff', strokeOpacity: 1, strokeWeight: 5, map, clickable: false, strokeLinecap: 'round', strokeLinejoin: 'round' }),
      )
    }
  }, [route]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!apiKey) {
    return <div className="w-full h-full flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 text-sm text-zinc-500">Google Maps API key not configured</div>
  }
  return <div ref={containerRef} className="w-full h-full" style={{ minHeight: 300 }} />
}

export default MapViewGoogle
