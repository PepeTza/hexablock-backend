import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import type { ErrorDetail, ErrorResponse } from './error-response';

/** Swagger description of one invalid field (api-contracts §1). */
export class ErrorDetailDto implements ErrorDetail {
  @ApiProperty({ example: 'username' })
  readonly field!: string;

  @ApiProperty({ example: 'length' })
  readonly issue!: string;
}

/**
 * Swagger description of the error body every endpoint shares
 * (api-contracts §1). The filter builds the body; this class only documents it.
 */
export class ErrorResponseDto implements ErrorResponse {
  @ApiProperty({ example: 400 })
  readonly statusCode!: number;

  @ApiProperty({ example: 'Bad Request' })
  readonly error!: string;

  @ApiProperty({ example: 'username must be between 3 and 20 characters' })
  readonly message!: string;

  @ApiPropertyOptional({ type: [ErrorDetailDto] })
  readonly details?: ErrorDetailDto[];

  @ApiProperty({ example: '6f1c2a9e-0000-4000-8000-000000000001' })
  readonly requestId!: string;
}
