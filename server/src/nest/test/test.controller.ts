import { Controller } from '@nestjs/common';

/**
 * Temporary test endpoints for external service integration.
 * describe-place moved to MapsController (POST /api/maps/describe-place).
 */
@Controller('api/test')
export class TestController {}
