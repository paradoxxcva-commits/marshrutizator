import { useState } from 'react'
import { useSettingsStore } from '../../store/settingsStore'
import { Layers } from 'lucide-react'

const STYLES = [
  { name: 'Liberty', url: 'https://tiles.openfreemap.org/styles/liberty', label: 'Либерти' },
  { name: 'Bright', url: 'https://tiles.openfreemap.org/styles/bright', label: 'Яркая' },
  { name: 'Positron', url: 'https://tiles.openfreemap.org/styles/positron', label: 'Светлая' },
] as const

export default function MapStyleToggle() {
  const [open, setOpen] = useState(false)
  const currentStyle = useSettingsStore(s => s.settings.maplibre_style || STYLES[0].url)
  const updateSettings = useSettingsStore(s => s.updateSettings)

  const currentIdx = STYLES.findIndex(s => s.url === currentStyle)

  const cycle = () => {
    const next = (currentIdx + 1) % STYLES.length
    updateSettings({ maplibre_style: STYLES[next].url })
  }

  return (
    <div style={{ position: 'relative', pointerEvents: 'auto' }}>
      <button
        onClick={cycle}
        onContextMenu={e => { e.preventDefault(); setOpen(v => !v) }}
        title={STYLES[currentIdx >= 0 ? currentIdx : 0].label}
        style={{
          background: 'var(--sidebar-bg)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          boxShadow: 'var(--sidebar-shadow, 0 4px 16px rgba(0,0,0,0.14))',
          borderRadius: 999, padding: 10, display: 'flex', flexShrink: 0,
          cursor: 'pointer', border: 'none', color: 'var(--text-primary)',
        }}
      >
        <Layers size={18} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
          marginBottom: 8, background: 'var(--sidebar-bg)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          boxShadow: 'var(--sidebar-shadow, 0 4px 16px rgba(0,0,0,0.14))',
          borderRadius: 12, overflow: 'hidden', minWidth: 140,
        }}>
          {STYLES.map((s, i) => (
            <button
              key={s.name}
              onClick={() => { updateSettings({ maplibre_style: s.url }); setOpen(false) }}
              style={{
                display: 'block', width: '100%', padding: '8px 14px',
                border: 'none', background: currentStyle === s.url ? 'var(--bg-hover)' : 'transparent',
                color: 'var(--text-primary)', fontSize: 12, fontWeight: currentStyle === s.url ? 600 : 400,
                cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                borderTop: i > 0 ? '1px solid var(--border-faint)' : 'none',
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
