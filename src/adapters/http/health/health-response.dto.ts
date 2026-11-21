import { ApiProperty } from '@nestjs/swagger';

/**
 * Body of `GET /health` (api-contracts §8). A class, not an interface, so
 * Swagger can read its properties and document the response.
 */
export class HealthResponse {
  @ApiProperty({ enum: ['ok', 'error'], example: 'ok' })
  readonly status!: 'ok' | 'error';

  @ApiProperty({ enum: ['ok', 'down'], example: 'ok' })
  readonly database!: 'ok' | 'down';
}
