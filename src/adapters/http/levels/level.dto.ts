import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsObject,
  IsOptional,
  Max,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

import type { PublishedLevel } from '../../../application/ports/level-catalog';
import { GAME_IDS, type GameId } from '../../../domain/game/game-id';
import type { SeedConfig } from '../../../domain/seed/seed-config';
import { SeedConfigRequest, toSeedConfig } from '../seed/seed-config.dto';

// Level orders are stored in an `int` column; a bigger `after` is a 400.
const MAX_ORDER = 2_147_483_647;

/**
 * Body of `POST /levels/{gameId}`. Checks the envelope only; the `spec` is
 * checked by the game's `ILevelSpecValidator` in the use case (`422`).
 */
export class PublishLevelRequest {
  @ApiProperty({
    example: 1,
    description: 'An integer; a version without a validator is a 422',
  })
  @IsInt()
  readonly schemaVersion!: number;

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    description: 'Variant-specific content (api-contracts §6)',
  })
  @IsObject()
  readonly spec!: Record<string, unknown>;

  @ApiProperty({
    type: SeedConfigRequest,
    required: false,
    description: 'Required for hexa-sort, not allowed for hexa-fit',
  })
  // Absent is fine; `null` must fail like any other non-object value.
  @ValidateIf((_body: object, value: unknown) => value !== undefined)
  @ValidateNested()
  @Type(() => SeedConfigRequest)
  readonly seedConfig?: SeedConfigRequest;
}

/** The `LevelDefinition` object of api-contracts §6. */
export class LevelDefinitionResponse {
  @ApiProperty({ example: '9c4e0000-0000-4000-8000-000000000001' })
  readonly id!: string;

  @ApiProperty({ enum: GAME_IDS, example: 'hexa-sort' })
  readonly gameId!: GameId;

  @ApiProperty({ example: 12 })
  readonly order!: number;

  @ApiProperty({ example: 1 })
  readonly schemaVersion!: number;

  @ApiProperty({ type: 'object', additionalProperties: true })
  readonly spec!: unknown;

  @ApiProperty({ example: '2026-11-10T22:05:00.000Z' })
  readonly publishedAt!: string;
}

/** Query of `GET /levels/{gameId}`: the last `order` the device has. */
export class ListLevelsQuery {
  @ApiProperty({
    required: false,
    minimum: 0,
    maximum: MAX_ORDER,
    example: 12,
    description: 'Return only levels with a greater order; all when absent',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(MAX_ORDER)
  readonly after?: number;
}

/** Body of `GET /levels/{gameId}`. */
export class LevelListResponse {
  @ApiProperty({ type: [LevelDefinitionResponse] })
  readonly levels!: LevelDefinitionResponse[];
}

/** The level's seed config as the domain type, or `null` when absent. */
export function toLevelSeedConfig(
  body: SeedConfigRequest | undefined,
): SeedConfig | null {
  return body === undefined ? null : toSeedConfig(body);
}

/** A published level as the contract's JSON (dates in ISO). */
export function toLevelDefinitionResponse(
  level: PublishedLevel,
): LevelDefinitionResponse {
  return { ...level, publishedAt: level.publishedAt.toISOString() };
}
