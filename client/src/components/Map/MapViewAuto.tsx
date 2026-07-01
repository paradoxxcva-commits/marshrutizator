import { lazy, Suspense } from 'react'
import { useSettingsStore } from '../../store/settingsStore'

// Lazy-load GL renderer
const MapViewGL = lazy(() => import('./MapViewGL').then(m => ({ default: m.MapViewGL })))

/**
 * Map renderer — MapLibre GL is the only provider.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function MapViewAuto(props: any) {
  return (
    <Suspense fallback={<div className="w-full h-full flex items-center justify-center bg-zinc-100 dark:bg-zinc-800"><div className="text-sm text-zinc-500">Loading map…</div></div>}>
      <MapViewGL {...props} glProvider="maplibre-gl" />
    </Suspense>
  )
}
