import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import apiClient from '../../api/client'
import { useTranslation } from '../../i18n'
import { useToast } from '../../components/shared/Toast'
import { useSettingsStore } from '../../store/settingsStore'

interface RegionFeature {
  type: 'Feature'
  properties: {
    iso_a2: string
    iso_3166_2: string
    name: string
    name_en?: string
    admin?: string
  }
  geometry: any
}

interface VisitedRegion {
  code: string
  name: string
  placeCount: number
  manuallyMarked?: boolean
}

const RUSSIA_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#6366f1', '#14b8a6',
  '#e11d48', '#84cc16', '#0ea5e9', '#a855f7', '#d946ef',
]

export function useRussiaMap() {
  const { t } = useTranslation()
  const toast = useToast()
  const dark = useSettingsStore(s => s.settings.dark_mode === 'dark' || s.settings.dark_mode === true)

  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<L.Map | null>(null)
  const regionLayerRef = useRef<L.GeoJSON | null>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  const [loading, setLoading] = useState(true)
  const [geoData, setGeoData] = useState<any>(null)
  const [visitedRegions, setVisitedRegions] = useState<Record<string, VisitedRegion[]>>({})
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState<{ code: string; name: string }[]>([])
  const [searchOpen, setSearchOpen] = useState(false)

  // Load Russia regions GeoJSON
  useEffect(() => {
    apiClient.get('/addons/atlas/regions/geo?countries=RU', { timeout: 30000 })
      .then(res => setGeoData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Load visited regions
  const loadVisited = useCallback(() => {
    apiClient.get(`/addons/atlas/regions?_t=${Date.now()}`)
      .then(r => setVisitedRegions(r.data?.regions || {}))
      .catch(() => {})
  }, [])

  useEffect(() => { loadVisited() }, [loadVisited])

  // Compute visited region codes
  const visitedCodes = useMemo(() => {
    const codes = new Set<string>()
    const ruRegions = visitedRegions['RU'] || []
    for (const r of ruRegions) codes.add(r.code)
    return codes
  }, [visitedRegions])

  // Region list for search
  const regionOptions = useMemo(() => {
    if (!geoData?.features) return []
    return geoData.features
      .filter((f: RegionFeature) => f.properties.iso_a2 === 'RU')
      .map((f: RegionFeature) => ({
        code: f.properties.iso_3166_2,
        name: f.properties.name,
      }))
      .sort((a: any, b: any) => a.name.localeCompare(b.name))
  }, [geoData])

  // Search filter
  useEffect(() => {
    if (!search.trim()) { setSearchResults([]); return }
    const q = search.toLowerCase()
    setSearchResults(regionOptions.filter(r => r.name.toLowerCase().includes(q)).slice(0, 8))
  }, [search, regionOptions])

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return

    const map = L.map(mapRef.current, {
      center: [60, 100],
      zoom: 3,
      minZoom: 3,
      maxZoom: 8,
      zoomControl: false,
      attributionControl: false,
      maxBounds: [[40, 20], [85, 180]],
      maxBoundsViscosity: 1.0,
      preferCanvas: true,
    })

    L.control.zoom({ position: 'bottomright' }).addTo(map)

    const tileUrl = dark
      ? 'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png'

    L.tileLayer(tileUrl, {
      maxZoom: 8,
      keepBuffer: 25,
      tileSize: 256,
      crossOrigin: true,
    } as any).addTo(map)

    mapInstance.current = map

    return () => { map.remove(); mapInstance.current = null }
  }, [dark])

  // Render regions on map
  useEffect(() => {
    if (!mapInstance.current || !geoData?.features) return

    if (regionLayerRef.current) {
      mapInstance.current.removeLayer(regionLayerRef.current)
    }

    const ruFeatures = geoData.features.filter((f: RegionFeature) => f.properties.iso_a2 === 'RU')

    const layer = L.geoJSON(
      { type: 'FeatureCollection', features: ruFeatures } as any,
      {
        style: (feature: any) => {
          const code = feature?.properties?.iso_3166_2
          const visited = visitedCodes.has(code)
          return {
            fillColor: visited ? RUSSIA_COLORS[Math.abs(hashCode(code)) % RUSSIA_COLORS.length] : '#94a3b8',
            fillOpacity: visited ? 0.6 : 0.15,
            color: visited ? '#1e293b' : '#64748b',
            weight: visited ? 2 : 1,
          }
        },
        onEachFeature: (feature: any, l: any) => {
          const name = feature.properties.name
          const code = feature.properties.iso_3166_2
          const visited = visitedCodes.has(code)

          l.on('mouseover', function (this: any) {
            this.setStyle({ fillOpacity: 0.8, weight: 3 })
            if (tooltipRef.current) {
              tooltipRef.current.innerHTML = `<div style="font-weight:600;font-size:13px">${name}</div><div style="font-size:11px;opacity:0.7">${visited ? '✓ Посещена' : 'Не посещена'}</div>`
              tooltipRef.current.style.display = 'block'
            }
          })

          l.on('mousemove', function (this: any, e: any) {
            if (tooltipRef.current) {
              tooltipRef.current.style.left = e.originalEvent.clientX + 12 + 'px'
              tooltipRef.current.style.top = e.originalEvent.clientY + 12 + 'px'
            }
          })

          l.on('mouseout', function (this: any) {
            this.setStyle({ fillOpacity: visited ? 0.6 : 0.15, weight: visited ? 2 : 1 })
            if (tooltipRef.current) tooltipRef.current.style.display = 'none'
          })

          l.on('click', () => {
            setSelectedRegion(code)
          })
        },
      }
    ).addTo(mapInstance.current)

    regionLayerRef.current = layer
  }, [geoData, visitedCodes])

  // Mark/unmark region
  const toggleRegion = useCallback(async (code: string, name: string) => {
    const isVisited = visitedCodes.has(code)
    try {
      if (isVisited) {
        await apiClient.delete(`/addons/atlas/region/${code}/mark`)
        toast.success(t('atlas.unmarked'))
      } else {
        await apiClient.post(`/addons/atlas/region/${code}/mark`, { name, country_code: 'RU' })
        toast.success(t('atlas.marked'))
      }
      loadVisited()
      setSelectedRegion(null)
    } catch {
      toast.error(t('atlas.error'))
    }
  }, [visitedCodes, loadVisited, toast, t])

  // Fly to region
  const flyToRegion = useCallback((code: string) => {
    if (!mapInstance.current || !regionLayerRef.current) return
    regionLayerRef.current.eachLayer((l: any) => {
      if (l.feature?.properties?.iso_3166_2 === code) {
        mapInstance.current!.fitBounds(l.getBounds(), { padding: [50, 50], maxZoom: 6 })
      }
    })
    setSearchOpen(false)
    setSearch('')
  }, [])

  const ruCount = visitedCodes.size
  const totalCount = regionOptions.length

  return {
    t, dark, loading, mapRef, tooltipRef,
    regionOptions, searchResults, search, setSearch, searchOpen, setSearchOpen,
    selectedRegion, setSelectedRegion, toggleRegion, flyToRegion,
    ruCount, totalCount, visitedCodes,
  }
}

function hashCode(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0
  return h
}
