import { useState } from 'react'
import { useSettingsStore } from '../../store/settingsStore'
import { Layers } from 'lucide-react'

const MAP_TYPES = [
  { key: 'roadmap', label: 'Карта' },
  { key: 'satellite', label: 'Спутник' },
  { key: 'hybrid', label: 'Гибрид' },
  { key: 'terrain', label: 'Рельеф' },
] as const

export default function MapStyleToggle() {
  const [open, setOpen] = useState(false)
  const currentType = useSettingsStore(s => s.settings.google_map_type || 'roadmap')
  const updateSettings = useSettingsStore(s => s.updateSettings)

  const currentIdx = MAP_TYPES.findIndex(t => t.key === currentType)

  const cycle = () => {
    const next = (currentIdx + 1) % MAP_TYPES.length
    updateSettings({ google_map_type: MAP_TYPES[next].key })
  }

  return (
    <div style={{ position: 'relative', pointerEvents: 'auto' }}>
      <button onClick={cycle} onContextMenu={e => { e.preventDefault(); setOpen(v => !v) }}
        title={MAP_TYPES[currentIdx >= 0 ? currentIdx : 0].label}
        style={{
          background: 'var(--sidebar-bg)', backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          boxShadow: 'var(--sidebar-shadow, 0 4px 16px rgba(0,0,0,0.14))',
          borderRadius: 999, padding: 10, display: 'flex', flexShrink: 0,
          cursor: 'pointer', border: 'none', color: 'var(--text-primary)',
        }}>
        <Layers size={18} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
          marginBottom: 8, background: 'var(--sidebar-bg)',
          backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          boxShadow: 'var(--sidebar-shadow, 0 4px 16px rgba(0,0,0,0.14))',
          borderRadius: 12, overflow: 'hidden', minWidth: 140,
        }}>
          {MAP_TYPES.map((t, i) => (
            <button key={t.key} onClick={() => { updateSettings({ google_map_type: t.key }); setOpen(false) }}
              style={{
                display: 'block', width: '100%', padding: '8px 14px', border: 'none',
                background: currentType === t.key ? 'var(--bg-hover)' : 'transparent',
                color: 'var(--text-primary)', fontSize: 12, fontWeight: currentType === t.key ? 600 : 400,
                cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                borderTop: i > 0 ? '1px solid var(--border-faint)' : 'none',
              }}>
              {t.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
