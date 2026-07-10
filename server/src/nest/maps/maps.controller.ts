import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { createReadStream } from 'node:fs';
import type {
  MapsAutocompleteResult,
  MapsPlaceDetailsResult,
  MapsPlacePhotoResult,
  MapsResolveUrlResult,
  MapsReverseResult,
  MapsSearchResult,
} from '@marshrutizator/shared';
import type { User } from '../../types';
import { MapsService } from './maps.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

type LocationBias = { low: { lat: number; lng: number }; high: { lat: number; lng: number } };

/** Maps a thrown service error to the same status + { error } body Express sent. */
function toHttpException(err: unknown, fallbackMessage: string, defaultStatus: number): HttpException {
  const status = (err as { status?: number }).status || defaultStatus;
  const message = err instanceof Error ? err.message : fallbackMessage;
  return new HttpException({ error: message }, status);
}

/** In-memory cache for describe-place results. TTL: 180 days. */
const describeCache = new Map<string, { data: unknown; at: number }>();
const DESCRIBE_TTL = 180 * 24 * 60 * 60 * 1000; // 180 days
const DESCRIBE_API = 'http://192.168.31.243:8899';

function describeCacheKey(lat: number, lng: number) {
  return `${lat.toFixed(4)},${lng.toFixed(4)}`;
}

/**
 * /api/maps — place search, autocomplete, details, photos, reverse geocoding and
 * Google-Maps-URL resolution.
 *
 * Behaviour is byte-identical to the legacy Express route (server/src/routes/
 * maps.ts): same auth, same bespoke 400 validation messages, the same
 * per-endpoint kill-switch short-circuits, the same error status/body mapping,
 * and the same diagnostic logging. The SSRF guard lives in the underlying
 * service and is reused unchanged.
 */
@Controller('api/maps')
@UseGuards(JwtAuthGuard)
export class MapsController {
  constructor(private readonly maps: MapsService) {}

  @Post('search')
  @HttpCode(200) // Express answers with res.json (200); Nest would otherwise default POST to 201.
  async search(
    @CurrentUser() user: User,
    @Body('query') query: unknown,
    @Query('lang') lang?: string,
    @Body('locationBias') locationBias?: { lat: number; lng: number; radius?: number },
  ): Promise<MapsSearchResult> {
    if (!query) {
      throw new HttpException({ error: 'Search query is required' }, 400);
    }
    // Optional bias toward a coordinate (lat/lng[/radius]); improves foreign-region queries.
    if (locationBias && !(Number.isFinite(locationBias.lat) && Number.isFinite(locationBias.lng))) {
      throw new HttpException({ error: 'Invalid locationBias: lat and lng must be finite numbers' }, 400);
    }
    try {
      return await this.maps.search(user.id, query as string, lang, locationBias);
    } catch (err: unknown) {
      console.error('Maps search error:', err);
      throw toHttpException(err, 'Search error', 500);
    }
  }

  // OSM-only POI explore: places of a category within the current map viewport.
  @Get('pois')
  async pois(
    @Query('category') category?: string,
    @Query('south') south?: string,
    @Query('west') west?: string,
    @Query('north') north?: string,
    @Query('east') east?: string,
  ) {
    if (!category) throw new HttpException({ error: 'A category is required' }, 400);
    const bbox = { south: Number(south), west: Number(west), north: Number(north), east: Number(east) };
    if (Object.values(bbox).some(v => !Number.isFinite(v))) {
      throw new HttpException({ error: 'A valid bbox (south, west, north, east) is required' }, 400);
    }
    try {
      return await this.maps.pois(category, bbox);
    } catch (err: unknown) {
      throw toHttpException(err, 'POI search error', 500);
    }
  }

  @Post('autocomplete')
  @HttpCode(200)
  async autocomplete(
    @CurrentUser() user: User,
    @Body('input') input: unknown,
    @Body('lang') lang?: string,
    @Body('locationBias') locationBias?: LocationBias,
  ): Promise<MapsAutocompleteResult | { suggestions: never[]; source: string }> {
    if (this.maps.autocompleteDisabled()) {
      return { suggestions: [], source: 'disabled' };
    }
    if (!input || typeof input !== 'string') {
      throw new HttpException({ error: 'Input is required' }, 400);
    }
    if (input.length > 200) {
      throw new HttpException({ error: 'Input too long (max 200 chars)' }, 400);
    }
    if (locationBias) {
      const { low, high } = locationBias;
      if (!low || !high
        || !Number.isFinite(low.lat) || !Number.isFinite(low.lng)
        || !Number.isFinite(high.lat) || !Number.isFinite(high.lng)) {
        throw new HttpException({ error: 'Invalid locationBias: low and high must have finite lat and lng' }, 400);
      }
    }
    try {
      return await this.maps.autocomplete(user.id, input, lang, locationBias);
    } catch (err: unknown) {
      console.error('Maps autocomplete error:', err);
      throw toHttpException(err, 'Autocomplete error', 500);
    }
  }

  @Get('details/:placeId')
  async details(
    @CurrentUser() user: User,
    @Param('placeId') placeId: string,
    @Query('expand') expand?: string,
    @Query('lang') lang?: string,
    @Query('refresh') refresh?: string,
  ): Promise<MapsPlaceDetailsResult> {
    if (this.maps.detailsDisabled()) {
      return { place: null, disabled: true };
    }
    try {
      return expand
        ? await this.maps.detailsExpanded(user.id, placeId, lang, refresh === '1')
        : await this.maps.details(user.id, placeId, lang);
    } catch (err: unknown) {
      console.error('Maps details error:', err);
      throw toHttpException(err, 'Error fetching place details', 500);
    }
  }

  @Get('place-photo/:placeId')
  async placePhoto(
    @CurrentUser() user: User,
    @Param('placeId') placeId: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('name') name?: string,
  ): Promise<MapsPlacePhotoResult | { photoUrl: null }> {
    // Kill-switch only applies to Google Places fetches — Wikimedia (coords:) stays allowed.
    if (!placeId.startsWith('coords:') && this.maps.photosDisabled()) {
      return { photoUrl: null };
    }
    try {
      return await this.maps.photo(user.id, placeId, parseFloat(lat as string), parseFloat(lng as string), name);
    } catch (err: unknown) {
      const status = (err as { status?: number }).status || 500;
      if (status >= 500) console.error('Place photo error:', err);
      throw toHttpException(err, 'Error fetching photo', 500);
    }
  }

  @Get('place-photo/:placeId/bytes')
  placePhotoBytes(@Param('placeId') placeId: string, @Res() res: Response): void {
    const fp = this.maps.photoBytesPath(placeId);
    if (!fp) {
      res.status(404).json({ error: 'Photo not cached' });
      return;
    }
    // Stream the cached file directly instead of res.sendFile(): the send library
    // bundled under @nestjs/platform-express rejects absolute Windows paths (drive
    // letter, no `root`) with a NotFoundError that surfaced as an unhandled 500,
    // even though the file exists. A plain read stream serves the bytes
    // cross-platform; a read error still yields the legacy 404. Cached photos are
    // always JPEG (placePhotoCache writes `<hash>.jpg`).
    res.set('Cache-Control', 'public, max-age=2592000, immutable');
    res.type('image/jpeg');
    const stream = createReadStream(fp);
    stream.on('error', () => {
      if (!res.headersSent) res.status(404).json({ error: 'Photo not cached' });
    });
    stream.pipe(res);
  }

  @Get('reverse')
  async reverse(
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('lang') lang?: string,
  ): Promise<MapsReverseResult> {
    if (!lat || !lng) {
      throw new HttpException({ error: 'lat and lng required' }, 400);
    }
    try {
      return await this.maps.reverse(lat, lng, lang);
    } catch {
      // The legacy route swallows reverse-geocode failures into an empty result.
      return { name: null, address: null };
    }
  }

  @Post('resolve-url')
  @HttpCode(200)
  async resolveUrl(@Body('url') url: unknown): Promise<MapsResolveUrlResult> {
    if (!url || typeof url !== 'string') {
      throw new HttpException({ error: 'URL is required' }, 400);
    }
    try {
      return await this.maps.resolveUrl(url);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to resolve URL';
      console.error('[Maps] URL resolve error:', message);
      throw toHttpException(err, 'Failed to resolve URL', 400);
    }
  }

  @Get('nearby')
  async nearby(
    @CurrentUser() user: User,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('radius') radius?: string,
  ) {
    const latNum = parseFloat(lat || '');
    const lngNum = parseFloat(lng || '');
    const radiusNum = parseInt(radius || '1500', 10);
    if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
      throw new HttpException({ error: 'lat and lng are required finite numbers' }, 400);
    }
    try {
      return await this.maps.nearby(user.id, latNum, lngNum, radiusNum);
    } catch (err: unknown) {
      throw toHttpException(err, 'Nearby search error', 500);
    }
  }

  /**
   * POST /api/maps/describe-place
   * Proxies to external describe-place API (http://192.168.31.243:8899) with 180-day cache.
   */
  @Post('describe-place')
  @HttpCode(200)
  async describePlace(@Body() body: { lat?: number; lng?: number }) {
    const { lat, lng } = body ?? {};
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new HttpException({ error: 'lat and lng are required' }, 400);
    }
    const key = describeCacheKey(lat!, lng!);
    const cached = describeCache.get(key);
    if (cached && Date.now() - cached.at < DESCRIBE_TTL) {
      return cached.data;
    }
    try {
      const response = await fetch(DESCRIBE_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng }),
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }
      const data = await response.json();
      describeCache.set(key, { data, at: Date.now() });
      return data;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'External service error';
      console.error('[Maps] describe-place error:', message);
      throw new HttpException({ error: message }, 502);
    }
  }
}
