import { Controller, Get, HttpException, Query } from '@nestjs/common';

/**
 * Temporary test endpoints for external service integration.
 */
@Controller('api/test')
export class TestController {
  /**
   * GET /api/test/describe-place?lat=57.249866&lng=60.074758
   * Proxies a request to the external describe-place webhook.
   */
  @Get('describe-place')
  async describePlace(
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
  ) {
    const latNum = parseFloat(lat || '');
    const lngNum = parseFloat(lng || '');
    if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
      throw new HttpException({ error: 'lat and lng are required' }, 400);
    }
    try {
      const response = await fetch('http://192.168.31.243:8644/webhooks/describe-place', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat: latNum, lng: lngNum }),
        signal: AbortSignal.timeout(30000),
      });
      const data = await response.json();
      return data;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'External service error';
      throw new HttpException({ error: message }, 502);
    }
  }
}
