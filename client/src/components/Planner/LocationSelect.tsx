import { useEffect, useRef, useState, useCallback } from 'react'
import { MapPin, X } from 'lucide-react'
import { mapsApi } from '../../api/client'
import { useTranslation } from '../../i18n'

export interface LocationPoint {
  name: string
  lat: number
  lng: number
  address?: string | null
}

interface Props {
  value: LocationPoint | null
  onChange: (loc: LocationPoint | null) => void
  placeholder?: string
  style?: React.CSSProperties
}

interface AutocompleteSuggestion {
  placeId: string
  mainText: string
  secondaryText: string
}

export default function LocationSelect({ value, onChange, placeholder, style }: Props) {
  const { t, locale } = useTranslation()
  const [query, setQuery] = useState(value?.name || '')
  const [open, setOpen] = useState(false)
  const [results, setResults] = useState<AutocompleteSuggestion[]>([])
  const [highlight, setHighlight] = useState(-1)
  const [loading, setLoading] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const acAbortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    setQuery(value?.name || '')
  }, [value])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Autocomplete fetch with AbortController — cancels in-flight requests on rapid typing
  const fetchSuggestions = useCallback(async (q: string) => {
    acAbortRef.current?.abort()
    const controller = new AbortController()
    acAbortRef.current = controller
    setLoading(true)
    try {
      const data = await mapsApi.autocomplete(q, locale, undefined, controller.signal)
      if (!controller.signal.aborted) {
        setResults(data.suggestions || [])
        setHighlight(-1)
      }
    } catch (err: unknown) {
      if (err instanceof Error && (err.name === 'AbortError' || err.name === 'CanceledError')) return
      if (!controller.signal.aborted) setResults([])
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }, [locale])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const trimmed = query.trim()
    if (trimmed.length < 2 || (value && trimmed === value.name)) {
      setResults([])
      acAbortRef.current?.abort()
      return
    }
    debounceRef.current = setTimeout(() => fetchSuggestions(trimmed), 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, value, fetchSuggestions])

  const pick = async (suggestion: AutocompleteSuggestion) => {
    setResults([])
    setOpen(false)
    setQuery(suggestion.mainText)
    setLoading(true)

    let loc: LocationPoint | null = null

    // Try details first (cached, fast)
    try {
      const detail = await mapsApi.details(suggestion.placeId, locale)
      if (detail.place?.lat != null && detail.place?.lng != null) {
        loc = {
          name: detail.place.name || suggestion.mainText,
          lat: Number(detail.place.lat),
          lng: Number(detail.place.lng),
          address: detail.place.address || suggestion.secondaryText || null,
        }
      }
    } catch { /* fall through to search fallback */ }

    // Fallback: full text search if details didn't return coordinates
    if (!loc) {
      try {
        const query = [suggestion.mainText, suggestion.secondaryText].filter(Boolean).join(', ')
        const search = await mapsApi.search(query, locale)
        const place = search.places?.[0]
        if (place?.lat != null && place?.lng != null) {
          loc = {
            name: place.name || suggestion.mainText,
            lat: Number(place.lat),
            lng: Number(place.lng),
            address: place.address || null,
          }
        }
      } catch { /* both failed */ }
    }

    setLoading(false)

    if (loc) {
      onChange(loc)
      setQuery(loc.name)
    } else {
      // Restore query if lookup failed
      setQuery(suggestion.mainText)
    }
  }

  const clear = () => {
    onChange(null)
    setQuery('')
    setResults([])
  }

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || results.length === 0) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight(h => Math.min(h + 1, results.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight(h => Math.max(h - 1, 0)) }
    else if (e.key === 'Enter' && highlight >= 0) { e.preventDefault(); pick(results[highlight]) }
    else if (e.key === 'Escape') setOpen(false)
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative', ...style }}>
      <div className="bg-surface-tertiary" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px', borderRadius: 10, border: '1px solid var(--border-primary)' }}>
        <MapPin size={14} className="text-content-faint" style={{ flexShrink: 0 }} />
        <input
          type="text"
          value={query}
          placeholder={placeholder ?? t('reservations.searchLocation')}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); if (value) onChange(null) }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKey}
          className="bg-transparent text-content"
          style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', fontSize: 13 }}
        />
        {value && (
          <button type="button" onClick={clear} className="bg-transparent text-content-faint" style={{ border: 'none', padding: 2, cursor: 'pointer', display: 'flex' }} aria-label="Clear">
            <X size={14} />
          </button>
        )}
      </div>

      {open && (loading || results.length > 0) && (
        <div className="bg-surface-card" style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, border: '1px solid var(--border-primary)', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.18)', maxHeight: 260, overflowY: 'auto', zIndex: 1000 }}>
          {loading && results.length === 0 && (
            <div className="text-content-faint" style={{ padding: 10, fontSize: 12 }}>{t('common.loading')}</div>
          )}
          {results.map((r, i) => (
            <button
              key={`${r.placeId || i}`}
              type="button"
              onClick={() => pick(r)}
              onMouseEnter={() => setHighlight(i)}
              className={`text-content ${i === highlight ? 'bg-surface-hover' : 'bg-transparent'}`}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 8, width: '100%',
                padding: '8px 12px', border: 'none', cursor: 'pointer', textAlign: 'left',
                fontFamily: 'inherit',
              }}
            >
              <MapPin size={12} className="text-content-faint" style={{ marginTop: 2, flexShrink: 0 }} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.mainText}</div>
                {r.secondaryText && (
                  <div className="text-content-faint" style={{ fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.secondaryText}</div>
                )}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
