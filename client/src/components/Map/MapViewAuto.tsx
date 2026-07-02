import { lazy, Suspense } from 'react'
import { useSettingsStore } from '../../store/settingsStore'

// Lazy-load GL renderers
const MapViewGL = lazy(() => import('./MapViewGL').then(m => ({ default: m.MapViewGL })))
const MapViewGoogle = lazy(() => import('./MapViewGoogle'))

/**
 * Map renderer — selects the right component based on the user's provider setting.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function MapViewAuto(props: any) {
  const provider = useSettingsStore(s => s.settings.map_provider) || 'maplibre-gl'

  if (provider === 'google-maps') {
    return (
      <Suspense fallback={<div className="w-full h-full flex items-center justify-center bg-zinc-100 dark:bg-zinc-800"><div className="text-sm text-zinc-500">Loading map…</div></div>}>
        <MapViewGoogle {...props} />
      </Suspense>
    )
  }

  return (
    <Suspense fallback={<div className="w-full h-full flex items-center justify-center bg-zinc-100 dark:bg-zinc-800"><div className="text-sm text-zinc-500">Loading map…</div></div>}>
      <MapViewGL {...props} glProvider={provider === 'mapbox-gl' ? 'mapbox-gl' : 'maplibre-gl'} />
    </Suspense>
  )
}
