import { useState, useEffect, useCallback, useRef } from 'react'
import { Search, MapPin, X, LocateFixed } from 'lucide-react'
import { mapsApi } from '../../api/client'

interface SearchResult {
  placeId: string
  name: string
  address: string
  lat: number
  lng: number
}

interface Props {
  flyTo: (lat: number, lng: number, zoom?: number) => void
}

export default function MapSearchBar({ flyTo }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [locating, setLocating] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Search history
  const [history, setHistory] = useState<{ name: string; address: string; lat: number; lng: number; google_place_id: string }[]>([])
  useEffect(() => {
    try { setHistory(JSON.parse(localStorage.getItem('marshrutizator_search_history') || '[]')) } catch {}
  }, [])

  const locateUser = useCallback(() => {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => { flyTo(pos.coords.latitude, pos.coords.longitude, 15); setLocating(false) },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [flyTo])

  const fetchSuggestions = useCallback(async (q: string) => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setLoading(true)
    try {
      const data = await mapsApi.autocomplete(q, 'ru', undefined, controller.signal)
      if (!controller.signal.aborted) {
        setResults((data.suggestions || []).map((s: any) => ({
          placeId: s.placeId, name: s.mainText, address: s.secondaryText || '', lat: 0, lng: 0,
        })))
      }
    } catch {
      if (!controller.signal.aborted) setResults([])
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const trimmed = query.trim()
    if (trimmed.length < 2) { setResults([]); abortRef.current?.abort(); return }
    debounceRef.current = setTimeout(() => fetchSuggestions(trimmed), 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, fetchSuggestions])

  const selectPlace = useCallback(async (result: SearchResult) => {
    try {
      const res = await mapsApi.details(result.placeId, 'ru')
      const d = res.place || res
      const lat = d.lat, lng = d.lng
      setQuery('')
      setResults([])
      setOpen(false)
      flyTo(lat, lng, 15)
      try {
        const h = JSON.parse(localStorage.getItem('marshrutizator_search_history') || '[]')
        const entry = { name: d.name || result.name, address: d.address || result.address, lat, lng, google_place_id: result.placeId }
        const filtered = [entry, ...h.filter((x: any) => x.google_place_id !== result.placeId)].slice(0, 5)
        localStorage.setItem('marshrutizator_search_history', JSON.stringify(filtered))
        setHistory(filtered)
      } catch {}
    } catch {}
  }, [flyTo, onPlaceSelect])

  const style: React.CSSProperties = {
    position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 1000,
    display: 'flex', alignItems: 'center', gap: 8,
    width: 'min(420px, calc(100vw - 32px))',
  }

  const barStyle: React.CSSProperties = {
    flex: 1, display: 'flex', alignItems: 'center', gap: 6,
    background: 'var(--sidebar-bg)',
    backdropFilter: 'blur(20px) saturate(180%)',
    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
    boxShadow: 'var(--sidebar-shadow, 0 4px 16px rgba(0,0,0,0.14))',
    borderRadius: 999, padding: '6px 14px',
  }

  return (
    <div style={style}>
      <button onClick={locateUser} title="Моё местоположение"
        style={{
          background: 'var(--sidebar-bg)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          boxShadow: 'var(--sidebar-shadow, 0 4px 16px rgba(0,0,0,0.14))',
          borderRadius: 999, padding: 10, display: 'flex', flexShrink: 0,
          cursor: 'pointer', border: 'none',
        }}>
        <LocateFixed size={18} style={{ color: locating ? '#3b82f6' : 'currentColor' }} />
      </button>

      <div style={barStyle}>
        <Search size={16} style={{ color: 'var(--text-faint)', flexShrink: 0 }} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          placeholder="Поиск мест..."
          style={{
            flex: 1, border: 'none', outline: 'none', background: 'transparent',
            color: 'var(--text-primary)', fontSize: 13, fontFamily: 'inherit',
          }}
        />
        {loading && <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>...</span>}
        {query && (
          <button onClick={() => { setQuery(''); setResults([]) }}
            style={{ background: 'none', border: 'none', padding: 2, cursor: 'pointer', display: 'flex' }}>
            <X size={14} style={{ color: 'var(--text-faint)' }} />
          </button>
        )}
      </div>

      {/* Search history */}
      {open && !query && history.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, marginTop: 4,
          background: 'var(--bg-card)', borderRadius: 10,
          boxShadow: '0 4px 16px rgba(0,0,0,0.15)', overflow: 'hidden',
          border: '1px solid var(--border-primary)',
        }}>
          <div style={{ padding: '6px 10px', fontSize: 10, fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Недавние</div>
          {history.map((h, i) => (
            <button key={i} onMouseDown={() => { flyTo(h.lat, h.lng, 15); setOpen(false) }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 10px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', borderTop: '1px solid var(--border-faint)' }}>
              <MapPin size={14} style={{ color: 'var(--text-faint)', flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.name}</div>
                {h.address && <div style={{ fontSize: 10, color: 'var(--text-faint)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.address}</div>}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Results */}
      {open && results.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, marginTop: 4,
          background: 'var(--bg-card)', borderRadius: 10,
          boxShadow: '0 4px 16px rgba(0,0,0,0.15)', overflow: 'hidden', maxHeight: 300, overflowY: 'auto',
          border: '1px solid var(--border-primary)',
        }}>
          {results.map(r => (
            <button key={r.placeId} onMouseDown={() => selectPlace(r)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 10px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', borderTop: '1px solid var(--border-faint)' }}>
              <MapPin size={14} style={{ color: 'var(--text-faint)', flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</div>
                {r.address && <div style={{ fontSize: 10, color: 'var(--text-faint)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.address}</div>}
              </div>
            </button>
          ))}
          {loading && <div style={{ padding: '8px 10px', fontSize: 11, color: 'var(--text-faint)', textAlign: 'center' }}>Поиск...</div>}
        </div>
      )}
    </div>
  )
}
