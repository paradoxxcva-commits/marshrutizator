import { Utensils, Coffee, Wine, BedDouble, Camera, Landmark, Trees, Ticket, type LucideIcon } from 'lucide-react'

// The POI categories shown in the map "explore" pill. The `key` is the contract
// with the server (CATEGORY_OSM_FILTERS in mapsService.ts) — the OSM tag mapping
// lives there; label/icon/colour live here. `color` doubles as the active-pill
// fill AND the marker colour, so the pill and the map agree visually.
export interface PoiCategory {
  key: string
  labelKey: string
  Icon: LucideIcon
  color: string
}

export const POI_CATEGORIES: PoiCategory[] = [
  { key: 'restaurant', labelKey: 'poi.cat.restaurants', Icon: Utensils, color: '#EF4444' },
  { key: 'cafe', labelKey: 'poi.cat.cafes', Icon: Coffee, color: '#B45309' },
  { key: 'bar', labelKey: 'poi.cat.bars', Icon: Wine, color: '#A855F7' },
  { key: 'hotel', labelKey: 'poi.cat.hotels', Icon: BedDouble, color: '#2563EB' },
  { key: 'sights', labelKey: 'poi.cat.sights', Icon: Camera, color: '#EC4899' },
  { key: 'museum', labelKey: 'poi.cat.museums', Icon: Landmark, color: '#6366F1' },
  { key: 'nature', labelKey: 'poi.cat.nature', Icon: Trees, color: '#16A34A' },
  { key: 'activity', labelKey: 'poi.cat.activities', Icon: Ticket, color: '#F59E0B' },
]

export const POI_CATEGORY_BY_KEY: Record<string, PoiCategory> = Object.fromEntries(
  POI_CATEGORIES.map(c => [c.key, c]),
)

// One POI result from /api/maps/pois (mirror of the server's OverpassPoi).
export interface Poi {
  osm_id: string
  name: string
  lat: number
  lng: number
  category: string
  poi_type: string
  address: string | null
  website: string | null
  phone: string | null
  opening_hours: string | null
  cuisine: string | null
  source: 'openstreetmap' | 'google'
}

// Map Google Places types to our category keys
const GOOGLE_TO_CATEGORY: Record<string, string> = {
  restaurant: 'restaurant', food: 'restaurant', meal_takeaway: 'restaurant', meal_delivery: 'restaurant',
  cafe: 'cafe', bakery: 'cafe',
  bar: 'bar', night_club: 'bar', pub: 'bar',
  lodging: 'hotel', hostel: 'hotel', guest_house: 'hotel', apartment: 'hotel', motel: 'hotel',
  tourist_attraction: 'sights', point_of_interest: 'sights',
  museum: 'museum', art_gallery: 'museum',
  park: 'nature', natural_feature: 'nature',
  aquarium: 'activity', zoo: 'activity', theme_park: 'activity',
}

export function mapGoogleTypeToCategory(types?: string[]): string {
  if (!types) return 'sights'
  for (const t of types) {
    const cat = GOOGLE_TO_CATEGORY[t]
    if (cat) return cat
  }
  return 'sights'
}
