import { ApiProperty } from '@nestjs/swagger';

import type {
  SeedConfigEntry,
  SeedConfigView,
} from '../../../application/use-cases/get-seed-config.use-case';
import { GAME_IDS, type GameId } from '../../../domain/game/game-id';
import {
  MAX_SEED_VALUE,
  type SeedConfig,
  SEED_MODES,
  type SeedMode,
} from '../../../domain/seed/seed-config';

/** The `SeedConfig` object of api-contracts §7. */
export class SeedConfigResponse {
  @ApiProperty({ enum: SEED_MODES, example: 'fixed' })
  readonly mode!: SeedMode;

  @ApiProperty({
    required: false,
    minimum: 0,
    maximum: MAX_SEED_VALUE,
    example: 1739201,
  })
  readonly value?: number;
}

/** Body for Hexa Lines and Hexa Merge: one config for the game. */
export class GameSeedConfigResponse {
  @ApiProperty({ enum: GAME_IDS, example: 'hexa-lines' })
  readonly gameId!: GameId;

  @ApiProperty({ type: SeedConfigResponse })
  readonly config!: SeedConfigResponse;

  @ApiProperty({
    type: String,
    nullable: true,
    example: '2026-11-10T22:05:00.000Z',
    description: 'null while the admin has never configured it',
  })
  readonly updatedAt!: string | null;
}

/** One Hexa Sort level and its config. */
export class LevelSeedConfigResponse {
  @ApiProperty({ example: '9c4e0000-0000-4000-8000-000000000001' })
  readonly levelId!: string;

  @ApiProperty({ type: SeedConfigResponse })
  readonly config!: SeedConfigResponse;

  @ApiProperty({
    type: String,
    nullable: true,
    example: '2026-11-10T22:05:00.000Z',
    description: 'null while the admin has never configured it',
  })
  readonly updatedAt!: string | null;
}

/** Body for Hexa Sort: one config per published level, in level order. */
export class LevelsSeedConfigResponse {
  @ApiProperty({ enum: GAME_IDS, example: 'hexa-sort' })
  readonly gameId!: GameId;

  @ApiProperty({ type: [LevelSeedConfigResponse] })
  readonly levels!: LevelSeedConfigResponse[];
}

export type SeedConfigBody = GameSeedConfigResponse | LevelsSeedConfigResponse;

/** The view in the contract's JSON: its shape follows the seed scope. */
export function toSeedConfigBody(view: SeedConfigView): SeedConfigBody {
  switch (view.scope) {
    case 'game':
      return { gameId: view.gameId, ...toEntryJson(view.entry) };
    case 'level':
      return {
        gameId: view.gameId,
        levels: view.levels.map((level) => ({
          levelId: level.levelId,
          ...toEntryJson(level),
        })),
      };
  }
}

function toEntryJson(entry: SeedConfigEntry) {
  return {
    config: toConfigJson(entry.config),
    updatedAt: entry.updatedAt?.toISOString() ?? null,
  };
}

/** `value` only when fixed, as §7 says. */
function toConfigJson(config: SeedConfig): SeedConfigResponse {
  return config.mode === 'fixed'
    ? { mode: 'fixed', value: config.value }
    : { mode: 'random' };
}
