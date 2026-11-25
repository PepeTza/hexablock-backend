import { ApiProperty } from '@nestjs/swagger';
import {
  IsIn,
  IsOptional,
  IsUUID,
  Validate,
  type ValidationArguments,
  ValidatorConstraint,
  type ValidatorConstraintInterface,
} from 'class-validator';

import { isRecord } from '../../../domain/level/json-shape';
import {
  MAX_SEED_VALUE,
  type SeedConfig,
  SEED_MODES,
  type SeedMode,
  seedConfigIssue,
} from '../../../domain/seed/seed-config';

/**
 * `fixed` needs a 32-bit `value` and `random` takes none (api-contracts §7).
 * Checks the whole object, so it runs even when `value` is absent.
 */
@ValidatorConstraint({ name: 'seedValue' })
class SeedValueRule implements ValidatorConstraintInterface {
  validate(_value: unknown, args: ValidationArguments): boolean {
    return issueOf(args.object) === null;
  }

  defaultMessage(args: ValidationArguments): string {
    return issueOf(args.object) ?? 'invalid seed config';
  }
}

/** An unknown mode is left to `@IsIn`, so it is reported only once. */
function issueOf(config: unknown): string | null {
  if (!isRecord(config)) {
    return 'seed config must be an object';
  }
  const knownMode = SEED_MODES.some((mode) => mode === config.mode);
  return knownMode ? seedConfigIssue(config.mode, config.value) : null;
}

/**
 * A `SeedConfig` in a request (api-contracts §7): the body of
 * `PUT /seed-config` and the `seedConfig` of `POST /levels`.
 */
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
  @Validate(SeedValueRule)
  readonly value?: number;
}

/** The request as the domain type; `SeedValueRule` already checked it. */
export function toSeedConfig(body: SeedConfigRequest): SeedConfig {
  return body.mode === 'fixed' && body.value !== undefined
    ? { mode: 'fixed', value: body.value }
    : { mode: 'random' };
}

/** Query of `PUT /seed-config/{gameId}`: which Hexa Sort level, if any. */
export class ConfigureSeedQuery {
  @ApiProperty({
    required: false,
    format: 'uuid',
    description: 'Required for hexa-sort, not allowed for the other games',
  })
  @IsOptional()
  @IsUUID()
  readonly levelId?: string;
}
