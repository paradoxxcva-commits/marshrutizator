import { useState, useEffect } from 'react'
import { mapsApi } from '../../api/client'

const detailsCache = new Map()

function getSessionCache(key: string) {
  try {
    const raw = sessionStorage.getItem(key)
    return raw ? JSON.parse(raw) : undefined
  } catch { return undefined }
}

function setSessionCache(key: string, value: any) {
  try { sessionStorage.setItem(key, JSON.stringify(value)) } catch {}
}

export function usePlaceDetails(googlePlaceId: string | undefined | null, osmId: string | undefined | null, language: string) {
  const [details, setDetails] = useState<any>(null)
  const detailId = googlePlaceId || osmId
  const cacheKey = `gdetails_${detailId}_${language}`
  useEffect(() => {
    if (!detailId) { setDetails(null); return }
    if (detailsCache.has(cacheKey)) { setDetails(detailsCache.get(cacheKey)); return }
    const cached = getSessionCache(cacheKey)
    if (cached) { detailsCache.set(cacheKey, cached); setDetails(cached); return }
    mapsApi.details(detailId, language).then((data: any) => {
      detailsCache.set(cacheKey, data.place)
      setSessionCache(cacheKey, data.place)
      setDetails(data.place)
    }).catch(() => {})
  }, [detailId, language])
  return details
}
