import { lazy, Suspense } from 'react'

// MapLibre GL-based map renderer (OpenFreeMap tiles, no token needed)
const MapViewGL = lazy(() => import('./MapViewGL').then(m => ({ default: m.MapViewGL })))

/**
 * Map renderer — always uses MapLibre GL with OpenFreeMap tiles.
 * Style switching (liberty/bright/positron) via a toggle button rendered in the parent.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function MapViewAuto(props: any) {
  return (
    <Suspense fallback={<div className="w-full h-full flex items-center justify-center bg-zinc-100 dark:bg-zinc-800"><div className="text-sm text-zinc-500">Loading map…</div></div>}>
      <MapViewGL {...props} glProvider="maplibre-gl" />
    </Suspense>
  )
}
