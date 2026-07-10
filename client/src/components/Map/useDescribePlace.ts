import { useState, useEffect, useRef } from 'react'
import { mapsApi } from '../../api/client'

interface DescribeResult {
  name?: string
  type?: string
  address?: string
  rating?: number
  reviews?: number
  hours?: Record<string, { open: string; close: string }>
  phone?: string
  coordinates?: { lat: number; lng: number }
  tags?: string[]
  description?: string
  image?: string
  photo?: string
  google_maps?: string
  yandex_maps?: string
}

const memCache = new Map<string, DescribeResult>()
const CACHE_PREFIX = 'describe_place_'
const TTL = 180 * 24 * 60 * 60 * 1000 // 180 days

const FAST_API = 'http://192.168.31.243:8899'

function cacheKey(lat: number, lng: number) {
  return `${lat.toFixed(4)},${lng.toFixed(4)}`
}

function getLocalCache(key: string): DescribeResult | undefined {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key)
    if (!raw) return undefined
    const { data, at } = JSON.parse(raw)
    if (Date.now() - at > TTL) { localStorage.removeItem(CACHE_PREFIX + key); return undefined }
    return data
  } catch { return undefined }
}

function setLocalCache(key: string, data: DescribeResult) {
  try { localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ data, at: Date.now() })) } catch {}
}

/** Check if the webhook response contains actual place data (not just an "accepted" ack). */
function hasPlaceData(result: unknown): result is DescribeResult {
  if (!result || typeof result !== 'object') return false
  const r = result as Record<string, unknown>
  if (r.status === 'accepted' && !r.name) return false
  return typeof r.name === 'string' && r.name.length > 0
}

/** Check if the fast API response has usable data. */
function hasFastData(result: unknown): result is DescribeResult {
  if (!result || typeof result !== 'object') return false
  const r = result as Record<string, unknown>
  return typeof r.name === 'string' && r.name.length > 0
}

/** Fetch from the fast API (http://192.168.31.243:8899), 5s timeout. */
async function fetchFastApi(lat: number, lng: number, signal?: AbortSignal): Promise<DescribeResult | null> {
  try {
    const res = await fetch(FAST_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat, lng }),
      signal,
    })
    if (!res.ok) return null
    const data = await res.json()
    return hasFastData(data) ? data : null
  } catch {
    return null
  }
}

export function useDescribePlace(lat: number | null | undefined, lng: number | null | undefined) {
  const [data, setData] = useState<DescribeResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (lat == null || lng == null) { setData(null); setLoading(false); setError(false); return }
    const key = cacheKey(lat, lng)
    // Check in-memory cache
    if (memCache.has(key)) { setData(memCache.get(key)!); setLoading(false); setError(false); return }
    // Check localStorage
    const local = getLocalCache(key)
    if (local) { memCache.set(key, local); setData(local); setLoading(false); setError(false); return }
    // Fetch from both sources in parallel
    setLoading(true); setError(false); setData(null)
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    const fastTimer = setTimeout(() => fastCtrl.abort(), 5000)
    const fastCtrl = new AbortController()
    const fastPromise = fetchFastApi(lat, lng, fastCtrl.signal)

    const webhookTimer = setTimeout(() => ctrl.abort(), 60000)
    const webhookPromise = mapsApi.describePlace(lat, lng)

    Promise.allSettled([fastPromise, webhookPromise]).then(([fastResult, webhookResult]) => {
      if (ctrl.signal.aborted) return
      clearTimeout(fastTimer)
      clearTimeout(webhookTimer)

      // Prefer fast API data, fall back to webhook
      let result: DescribeResult | null = null
      if (fastResult.status === 'fulfilled' && fastResult.value) {
        result = fastResult.value
      } else if (webhookResult.status === 'fulfilled' && hasPlaceData(webhookResult.value)) {
        result = webhookResult.value
      }

      if (result) {
        memCache.set(key, result)
        setLocalCache(key, result)
        setData(result)
      } else {
        setData(null)
      }
      setLoading(false)
    }).catch(() => {
      if (ctrl.signal.aborted) return
      clearTimeout(fastTimer)
      clearTimeout(webhookTimer)
      setError(true)
      setLoading(false)
    })

    return () => {
      ctrl.abort()
      fastCtrl.abort()
      clearTimeout(fastTimer)
      clearTimeout(webhookTimer)
    }
  }, [lat, lng])

  return { data, loading, error }
}
