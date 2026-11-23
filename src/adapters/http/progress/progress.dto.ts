import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

import type { StoredProgress } from '../../../application/ports/progress-repository';
import { GAME_IDS, type GameId } from '../../../domain/game/game-id';
import type { PlayerProgressProps } from '../../../domain/progress/player-progress';

// Scores are stored in `int` columns; a bigger number is a 400, not a 500.
const MAX_SCORE = 2_147_483_647;

/** One completed level sent by the device (api-contracts §4). */
export class LevelResultRequest {
  @ApiProperty({
    format: 'uuid',
    example: '3b2a0000-0000-4000-8000-000000000001',
  })
  @IsUUID()
  readonly levelId!: string;

  @ApiProperty({ minimum: 0, example: 1840 })
  @IsInt()
  @Min(0)
  @Max(MAX_SCORE)
  readonly bestScore!: number;

  @ApiProperty({
    minimum: 1,
    maximum: 3,
    nullable: true,
    required: false,
    description: '1 to 3 in hexa-fit; null or absent in hexa-sort',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3)
  readonly stars?: number | null;
}

/**
 * Body of `PUT /progress/{gameId}`: a `PlayerProgress` without `updatedAt`.
 * Checks shape and types; the rules that depend on the game (stars, levels
 * in endless games) are checked by the `PlayerProgress` entity.
 */
export class PlayerProgressRequest {
  @ApiProperty({ enum: GAME_IDS, example: 'hexa-fit' })
  @IsIn(GAME_IDS)
  readonly gameId!: GameId;

  @ApiProperty({
    minimum: 0,
    example: 0,
    description: 'Always 0 in hexa-fit and hexa-sort',
  })
  @IsInt()
  @Min(0)
  @Max(MAX_SCORE)
  readonly bestScore!: number;

  @ApiProperty({
    type: [LevelResultRequest],
    description: 'Always [] in hexa-lines and hexa-merge',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LevelResultRequest)
  readonly levels!: LevelResultRequest[];
}

/** One completed level in a response. */
export class LevelResultResponse {
  @ApiProperty({ example: '3b2a0000-0000-4000-8000-000000000001' })
  readonly levelId!: string;

  @ApiProperty({ example: 1840 })
  readonly bestScore!: number;

  @ApiProperty({ type: Number, nullable: true, example: 3 })
  readonly stars!: number | null;
}

/** The `PlayerProgress` object of api-contracts §4. */
export class PlayerProgressResponse {
  @ApiProperty({ enum: GAME_IDS, example: 'hexa-fit' })
  readonly gameId!: GameId;

  @ApiProperty({ example: 0 })
  readonly bestScore!: number;

  @ApiProperty({ type: [LevelResultResponse] })
  readonly levels!: LevelResultResponse[];

  @ApiProperty({
    example: '2026-11-10T22:05:00.000Z',
    description: 'Set by the server',
  })
  readonly updatedAt!: string;
}

/** Body of `GET /progress`: games never played are left out. */
export class ProgressListResponse {
  @ApiProperty({ type: [PlayerProgressResponse] })
  readonly progress!: PlayerProgressResponse[];
}

/** The request body as the use case expects it (absent stars are `null`). */
export function toPlayerProgressProps(
  body: PlayerProgressRequest,
): PlayerProgressProps {
  return {
    gameId: body.gameId,
    bestScore: body.bestScore,
    levels: body.levels.map((level) => ({
      levelId: level.levelId,
      bestScore: level.bestScore,
      stars: level.stars ?? null,
    })),
  };
}

/** Turns a stored progress into the contract's JSON (dates in ISO). */
export function toPlayerProgressResponse({
  progress,
  updatedAt,
}: StoredProgress): PlayerProgressResponse {
  return {
    gameId: progress.gameId,
    bestScore: progress.bestScore,
    levels: progress.levels.map((level) => ({ ...level })),
    updatedAt: updatedAt.toISOString(),
  };
}
