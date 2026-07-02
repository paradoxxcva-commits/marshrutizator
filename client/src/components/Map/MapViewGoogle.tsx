import { useEffect, useRef, useCallback } from 'react'
import { useSettingsStore } from '../../store/settingsStore'
import type { Place } from '../../types'

declare global {
  interface Window {
    google?: { maps?: any }
    __googleMapsScriptLoaded?: boolean
    __googleMapsPromise?: Promise<void>
  }
}

function loadGoogleMapsScript(apiKey: string): Promise<void> {
  if (window.google?.maps) return Promise.resolve()
  if (window.__googleMapsPromise) return window.__googleMapsPromise

  window.__googleMapsPromise = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById('google-maps-script')
    if (existing) {
      // Script tag exists but google.maps not loaded yet — wait
      const check = setInterval(() => {
        if (window.google?.maps) { clearInterval(check); resolve() }
      }, 100)
      setTimeout(() => { clearInterval(check); reject(new Error('Google Maps load timeout')) }, 10000)
      return
    }
    const script = document.createElement('script')
    script.id = 'google-maps-script'
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places&language=ru`
    script.async = true
    script.defer = true
    script.onload = () => {
      const check = setInterval(() => {
        if (window.google?.maps) { clearInterval(check); resolve() }
      }, 100)
      setTimeout(() => { clearInterval(check); reject(new Error('Google Maps init timeout')) }, 10000)
    }
    script.onerror = () => reject(new Error('Failed to load Google Maps script'))
    document.head.appendChild(script)
  })
  return window.__googleMapsPromise
}

interface Props {
  places?: Place[]
  center?: [number, number]
  zoom?: number
  fitKey?: number
  selectedPlaceId?: number | null
  onMarkerClick?: (place: Place) => void
  onMapClick?: (lat: number, lng: number) => void
  className?: string
}

export default function MapViewGoogle({
  places = [],
  center = [55.7558, 37.6173],
  zoom = 10,
  fitKey = 0,
  selectedPlaceId = null,
  onMarkerClick,
  onMapClick,
  className = '',
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const markersRef = useRef<Map<number, any>>(new Map())
  const routeLineRef = useRef<any>(null)
  const apiKey = useSettingsStore(s => s.settings.maps_api_key || '')
  const mapLang = useSettingsStore(s => s.settings.language)

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || !apiKey) return
    let cancelled = false

    loadGoogleMapsScript(apiKey).then(() => {
      if (cancelled || !containerRef.current || !window.google?.maps) return

      const map = new window.google.maps.Map(containerRef.current, {
        center: { lat: center[0], lng: center[1] },
        zoom,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        zoomControl: true,
        styles: [
          { featureType: 'poi', stylers: [{ visibility: 'off' }] },
        ],
        language: mapLang === 'ru' ? 'ru' : 'en',
      })

      map.addListener('click', (e: any) => {
        if (e.latLng && onMapClick) {
          onMapClick(e.latLng.lat(), e.latLng.lng())
        }
      })

      mapRef.current = map
    }).catch(err => {
      console.error('Google Maps failed to load:', err)
    })

    return () => { cancelled = true }
  }, [apiKey, mapLang]) // eslint-disable-line react-hooks/exhaustive-deps

  // Update center when fitKey changes
  useEffect(() => {
    if (!mapRef.current) return
    if (places.length > 0) {
      const bounds = new window.google.maps.LatLngBounds()
      places.forEach(p => { if (p.lat && p.lng) bounds.extend({ lat: p.lat, lng: p.lng }) })
      mapRef.current.fitBounds(bounds, { padding: 50 })
    } else {
      mapRef.current.setCenter({ lat: center[0], lng: center[1] })
      mapRef.current.setZoom(zoom)
    }
  }, [fitKey, places, center, zoom])

  // Update markers
  useEffect(() => {
    if (!mapRef.current || !window.google?.maps) return
    const map = mapRef.current

    // Clear old markers
    markersRef.current.forEach(m => m.setMap(null))
    markersRef.current.clear()

    places.forEach(place => {
      if (!place.lat || !place.lng) return
      const isSelected = place.id === selectedPlaceId
      const pinColor = isSelected ? '#ef4444' : '#3b82f6'
      const scale = isSelected ? 1.3 : 1

      const marker = new window.google.maps.Marker({
        position: { lat: place.lat, lng: place.lng },
        map,
        title: place.name,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 8 * scale,
          fillColor: pinColor,
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
        label: {
          text: String(place.order || places.indexOf(place) + 1),
          color: '#ffffff',
          fontSize: '11px',
          fontWeight: 'bold',
        },
      })

      marker.addListener('click', () => {
        if (onMarkerClick) onMarkerClick(place)
      })

      markersRef.current.set(place.id, marker)
    })
  }, [places, selectedPlaceId, onMarkerClick])

  // Draw route polyline
  useEffect(() => {
    if (!mapRef.current || !window.google?.maps) return

    if (routeLineRef.current) {
      routeLineRef.current.setMap(null)
      routeLineRef.current = null
    }

    const routePlaces = places.filter(p => p.lat && p.lng)
    if (routePlaces.length < 2) return

    const path = routePlaces.map(p => ({ lat: p.lat!, lng: p.lng! }))
    routeLineRef.current = new window.google.maps.Polyline({
      path,
      geodesic: true,
      strokeColor: '#3b82f6',
      strokeOpacity: 0.8,
      strokeWeight: 3,
      map: mapRef.current,
    })
  }, [places])

  if (!apiKey) {
    return (
      <div className={`flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 text-sm text-zinc-500 ${className}`}>
        Google Maps API key not configured
      </div>
    )
  }

  return (
    <div ref={containerRef} className={`w-full h-full ${className}`} style={{ minHeight: 300 }} />
  )
}
