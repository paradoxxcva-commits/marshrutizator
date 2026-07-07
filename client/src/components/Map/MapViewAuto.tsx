import { lazy, Suspense } from 'react'

// Google Maps renderer — the only map provider
const MapViewGoogle = lazy(() => import('./MapViewGoogle'))

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function MapViewAuto(props: any) {
  return (
    <Suspense fallback={<div className="w-full h-full flex items-center justify-center bg-zinc-100 dark:bg-zinc-800"><div className="text-sm text-zinc-500">Loading map…</div></div>}>
      <MapViewGoogle {...props} />
    </Suspense>
  )
}
