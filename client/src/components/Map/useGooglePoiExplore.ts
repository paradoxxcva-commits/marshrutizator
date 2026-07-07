import { useState, useRef, useCallback } from 'react'
import { mapsApi } from '../../api/client'
import { mapGoogleTypeToCategory, type Poi } from './poiCategories'

interface NearbyPlaceResult {
  place_id: string
  name: string
  vicinity: string
  geometry: { location: { lat: number; lng: number } }
  rating?: number
  types?: string[]
  opening_hours?: { open_now?: boolean }
}

function isAbortError(err: unknown): boolean {
  const e = err as { name?: string; code?: string } | null
  return e?.name === 'CanceledError' || e?.code === 'ERR_CANCELED' || e?.name === 'AbortError'
}

function placeToPoi(p: NearbyPlaceResult): Poi {
  const lat = p.geometry.location.lat
  const lng = p.geometry.location.lng
  return {
    osm_id: `google:${p.place_id}`,
    name: p.name,
    lat,
    lng,
    category: mapGoogleTypeToCategory(p.types),
    poi_type: p.types?.[0] || 'point_of_interest',
    address: p.vicinity || null,
    website: null,
    phone: null,
    opening_hours: p.opening_hours?.open_now ? 'Открыто' : null,
    cuisine: null,
    source: 'google',
    google_maps_url: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
  }
}

export function useGooglePoiExplore() {
  const [googlePois, setGooglePois] = useState<Poi[]>([])
  const [enabled, setEnabled] = useState(false)
  const [loading, setLoading] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const viewportRef = useRef<{ lat: number; lng: number } | null>(null)
  const lastFetchRef = useRef<{ lat: number; lng: number } | null>(null)

  const fetchNearby = useCallback(async (lat: number, lng: number) => {
    if (lastFetchRef.current) {
      const dlat = Math.abs(lat - lastFetchRef.current.lat)
      const dlng = Math.abs(lng - lastFetchRef.current.lng)
      if (dlat < 0.005 && dlng < 0.005) return
    }
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setLoading(true)
    try {
      const data = await mapsApi.nearby(lat, lng, 2000)
      if (ctrl.signal.aborted) return
      setGooglePois((data.places || []).map(placeToPoi))
      lastFetchRef.current = { lat, lng }
    } catch (err) {
      if (!isAbortError(err)) {
        console.error('[GooglePoi] fetch failed:', err)
        setGooglePois([])
      }
    } finally {
      if (!ctrl.signal.aborted) setLoading(false)
    }
  }, [])

  const onViewportChange = useCallback((bbox: { south: number; west: number; north: number; east: number }) => {
    viewportRef.current = { lat: (bbox.south + bbox.north) / 2, lng: (bbox.west + bbox.east) / 2 }
    if (!enabled) return
    fetchNearby(viewportRef.current.lat, viewportRef.current.lng)
  }, [enabled, fetchNearby])

  const toggle = useCallback(() => {
    setEnabled(prev => {
      const next = !prev
      if (next && viewportRef.current) {
        fetchNearby(viewportRef.current.lat, viewportRef.current.lng)
      }
      if (!next) {
        setGooglePois([])
        abortRef.current?.abort()
      }
      return next
    })
  }, [fetchNearby])

  return { googlePois, enabled, toggle, loading, onViewportChange }
}
