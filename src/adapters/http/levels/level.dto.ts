import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  Min,
  Validate,
  type ValidationArguments,
  ValidateNested,
  ValidatorConstraint,
  type ValidatorConstraintInterface,
} from 'class-validator';

import type { PublishedLevel } from '../../../application/ports/level-catalog';
import { GAME_IDS, type GameId } from '../../../domain/game/game-id';
import { isRecord } from '../../../domain/level/json-shape';
import {
  MAX_SEED_VALUE,
  type SeedConfig,
  SEED_MODES,
  type SeedMode,
  seedConfigIssue,
} from '../../../domain/seed/seed-config';

/** `fixed` needs a 32-bit `value`; `random` takes none (api-contracts §7). */
@ValidatorConstraint({ name: 'seedConfig' })
class SeedConfigRule implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return isRecord(value) && seedConfigIssue(value.mode, value.value) === null;
  }

  defaultMessage(args: ValidationArguments): string {
    const value: unknown = args.value;
    return isRecord(value)
      ? (seedConfigIssue(value.mode, value.value) ?? 'invalid seedConfig')
      : 'seedConfig must be an object';
  }
}

/** The seed config of a Hexa Sort level (api-contracts §7). */
export class SeedConfigRequest {
  @ApiProperty({ enum: SEED_MODES, example: 'random' })
  @IsIn(SEED_MODES)
  readonly mode!: SeedMode;

  @ApiProperty({
    required: false,
    minimum: 0,
    maximum: MAX_SEED_VALUE,
    description: 'Required when mode is fixed, absent when random',
  })
  @IsOptional()
  readonly value?: number;
}

/**
 * Body of `POST /levels/{gameId}`. Checks the envelope only; the `spec` is
 * checked by the game's `ILevelSpecValidator` in the use case (`422`).
 */
export class PublishLevelRequest {
  @ApiProperty({ minimum: 1, example: 1 })
  @IsInt()
  @Min(1)
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
  @IsOptional()
  @Validate(SeedConfigRule)
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
    example: 12,
    description: 'Return only levels with a greater order; all when absent',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  readonly after?: number;
}

/** Body of `GET /levels/{gameId}`. */
export class LevelListResponse {
  @ApiProperty({ type: [LevelDefinitionResponse] })
  readonly levels!: LevelDefinitionResponse[];
}

/** The request's seed config as the domain type, or `null` when absent. */
export function toSeedConfig(
  body: SeedConfigRequest | undefined,
): SeedConfig | null {
  if (body === undefined) {
    return null;
  }
  // SeedConfigRule already guaranteed a value exactly when mode is fixed.
  return body.mode === 'fixed' && body.value !== undefined
    ? { mode: 'fixed', value: body.value }
    : { mode: 'random' };
}

/** A published level as the contract's JSON (dates in ISO). */
export function toLevelDefinitionResponse(
  level: PublishedLevel,
): LevelDefinitionResponse {
  return { ...level, publishedAt: level.publishedAt.toISOString() };
}
