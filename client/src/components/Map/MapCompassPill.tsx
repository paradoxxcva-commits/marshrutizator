import { Navigation } from 'lucide-react'

/**
 * Compass pill for the Google Maps planner map. Resets heading to north on click.
 * Google Maps doesn't support rotation like MapLibre, so this just resets tilt.
 */
export function MapCompassPill({ map }: { map: any }) {
  const resetNorth = () => {
    if (!map) return
    // Google Maps: reset tilt and heading
    map.setTilt(0)
    map.setHeading(0)
  }

  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', padding: 4, borderRadius: 999, pointerEvents: 'auto',
      background: 'var(--sidebar-bg)',
      backdropFilter: 'blur(20px) saturate(180%)',
      WebkitBackdropFilter: 'blur(20px) saturate(180%)',
      boxShadow: 'var(--sidebar-shadow, 0 4px 16px rgba(0,0,0,0.14))',
    }}>
      <button
        type="button"
        onClick={resetNorth}
        aria-label="Reset north"
        className="text-content-muted"
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 34, height: 34, borderRadius: 999, border: 'none', cursor: 'pointer',
          background: 'transparent', padding: 0,
          transition: 'background 0.14s, color 0.14s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
      >
        <Navigation size={16} strokeWidth={2} />
      </button>
    </div>
  )
}
