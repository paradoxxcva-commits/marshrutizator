import React, { useState } from 'react'
import { MapPin, Search, X, Globe } from 'lucide-react'
import Navbar from '../components/Layout/Navbar'
import { useRussiaMap } from './russia/useRussiaMap'

export default function RussiaMapPage(): React.ReactElement {
  const {
    t, dark, loading, mapRef, tooltipRef,
    regionOptions, searchResults, search, setSearch, searchOpen, setSearchOpen,
    selectedRegion, setSelectedRegion, toggleRegion, flyToRegion,
    ruCount, totalCount, visitedCodes,
  } = useRussiaMap()

  const [confirmCode, setConfirmCode] = useState<string | null>(null)
  const [confirmName, setConfirmName] = useState('')

  const selectedName = selectedRegion
    ? regionOptions.find(r => r.code === selectedRegion)?.name || selectedRegion
    : ''

  return (
    <div className="h-screen flex flex-col bg-surface">
      <Navbar />

      <div className="flex-1 relative overflow-hidden">
        {/* Map */}
        <div ref={mapRef} className="absolute inset-0" />

        {/* Tooltip */}
        <div ref={tooltipRef} className="fixed z-50 pointer-events-none bg-white dark:bg-slate-800 rounded-lg shadow-lg px-3 py-2 border border-slate-200 dark:border-slate-700" style={{ display: 'none' }} />

        {/* Loading */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-surface/80 z-20">
            <div className="flex items-center gap-3 text-sm text-content-secondary">
              <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
              Загрузка карты...
            </div>
          </div>
        )}

        {/* Stats bar — top left */}
        <div className="absolute z-10 flex items-center gap-3 px-4 py-2.5 rounded-xl" style={{
          top: 'calc(var(--nav-h) + 16px)', left: 16,
          background: dark ? 'rgba(10,10,15,0.7)' : 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(12px)',
          border: `1px solid ${dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
        }}>
          <span style={{ fontSize: 22 }}>🇷🇺</span>
          <div>
            <span className="text-xl font-black tabular-nums" style={{ color: dark ? '#fff' : '#0f172a' }}>
              {ruCount}<span className="text-sm font-normal" style={{ color: dark ? '#94a3b8' : '#64748b' }}> / {totalCount}</span>
            </span>
            <div className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: dark ? '#64748b' : '#94a3b8' }}>
              областей
            </div>
          </div>
        </div>

        {/* Search — top right */}
        <div className="absolute z-10" style={{ top: 'calc(var(--nav-h) + 16px)', right: 16 }}>
          <div className="relative">
            <div className="flex items-center rounded-lg overflow-hidden" style={{
              background: dark ? 'rgba(10,10,15,0.7)' : 'rgba(255,255,255,0.85)',
              backdropFilter: 'blur(12px)',
              border: `1px solid ${dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
            }}>
              <input
                type="text"
                value={search}
                onChange={e => { setSearch(e.target.value); setSearchOpen(true) }}
                onFocus={() => setSearchOpen(true)}
                onBlur={() => setTimeout(() => setSearchOpen(false), 200)}
                placeholder="Поиск области..."
                className="bg-transparent outline-none px-3 py-1.5 text-sm w-48"
                style={{ color: dark ? '#fff' : '#0f172a' }}
              />
              {search ? (
                <button onClick={() => { setSearch(''); setSearchOpen(false) }} className="px-2 py-1.5" style={{ color: dark ? '#94a3b8' : '#64748b' }}>
                  <X size={14} />
                </button>
              ) : (
                <Search size={14} className="px-2" style={{ color: dark ? '#94a3b8' : '#64748b' }} />
              )}
            </div>

            {searchOpen && searchResults.length > 0 && (
              <div className="absolute top-full mt-1 left-0 right-0 rounded-lg shadow-lg overflow-hidden" style={{
                background: dark ? '#1e293b' : '#fff',
                border: `1px solid ${dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
              }}>
                {searchResults.map(r => (
                  <button
                    key={r.code}
                    onMouseDown={() => flyToRegion(r.code)}
                    className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    style={{ color: dark ? '#e2e8f0' : '#1e293b' }}
                  >
                    {visitedCodes.has(r.code) && <span className="text-green-500">✓</span>}
                    {r.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Legend — bottom left */}
        <div className="absolute z-10 px-3 py-2 rounded-lg text-[10px]" style={{
          bottom: 16, left: 16,
          background: dark ? 'rgba(10,10,15,0.7)' : 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(12px)',
          border: `1px solid ${dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
          color: dark ? '#94a3b8' : '#64748b',
        }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-3 h-3 rounded" style={{ background: '#3b82f6', opacity: 0.6 }} /> Посещена
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded" style={{ background: '#94a3b8', opacity: 0.15 }} /> Не посещена
          </div>
        </div>

        {/* Region action dialog */}
        {selectedRegion && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setSelectedRegion(null)}>
            <div className="bg-surface-card rounded-2xl p-6 max-w-xs w-full shadow-xl text-center" onClick={e => e.stopPropagation()}>
              <Globe size={28} className="mx-auto mb-3" style={{ color: dark ? '#94a3b8' : '#64748b' }} />
              <h3 className="text-base font-semibold mb-1" style={{ color: dark ? '#f1f5f9' : '#0f172a' }}>{selectedName}</h3>
              <p className="text-xs mb-4" style={{ color: dark ? '#64748b' : '#94a3b8' }}>
                {visitedCodes.has(selectedRegion) ? 'Уже посещена' : 'Отметить как посещённую?'}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedRegion(null)}
                  className="flex-1 px-4 py-2 rounded-lg text-sm font-medium border"
                  style={{ borderColor: dark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)', color: dark ? '#94a3b8' : '#64748b' }}
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={() => toggleRegion(selectedRegion, selectedName)}
                  className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-white"
                  style={{ background: visitedCodes.has(selectedRegion) ? '#ef4444' : '#3b82f6' }}
                >
                  {visitedCodes.has(selectedRegion) ? 'Убрать' : 'Отметить'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
