import { lazy, Suspense } from 'react'

// Leaflet-based map renderer (Carto tiles + full features)
const MapViewLeaflet = lazy(() => import('./MapView').then(m => ({ default: m.MapView })))

/**
 * Map renderer — uses Leaflet with Carto tiles (OpenStreetMap).
 * Google Places API is used for POI search independently via server endpoints.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function MapViewAuto(props: any) {
  return (
    <Suspense fallback={<div className="w-full h-full flex items-center justify-center bg-zinc-100 dark:bg-zinc-800"><div className="text-sm text-zinc-500">Loading map…</div></div>}>
      <MapViewLeaflet {...props} />
    </Suspense>
  )
}
