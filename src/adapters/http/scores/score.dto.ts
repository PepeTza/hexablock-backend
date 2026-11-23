import { ApiProperty } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

import type { ScoreOutcome } from '../../../application/ports/score-repository';
import { GAME_IDS, type GameId } from '../../../domain/game/game-id';
import type { ScoreClaimProps } from '../../../domain/score/score-claim';

// Counts are stored in `int` columns; a bigger number is a 400, not a 500.
const MAX_INT = 2_147_483_647;

/**
 * Body of `POST /scores` (api-contracts §5). Checks shape and types; the
 * rules that depend on the game (`levelId`, `seed`) and plausibility are
 * checked by the domain.
 */
export class SubmitScoreRequest {
  @ApiProperty({
    format: 'uuid',
    example: 'e3d1c2b4-0000-4000-8000-000000000001',
  })
  @IsUUID()
  readonly sessionId!: string;

  @ApiProperty({ enum: GAME_IDS, example: 'hexa-lines' })
  @IsIn(GAME_IDS)
  readonly gameId!: GameId;

  @ApiProperty({
    format: 'uuid',
    nullable: true,
    required: false,
    description: 'Required in hexa-fit and hexa-sort; null in the others',
  })
  @IsOptional()
  @IsUUID()
  readonly levelId?: string | null;

  @ApiProperty({ minimum: 0, example: 120 })
  @IsInt()
  @Min(0)
  @Max(MAX_INT)
  readonly score!: number;

  @ApiProperty({
    type: Number,
    nullable: true,
    required: false,
    example: 1739201,
    description: 'null in hexa-fit',
  })
  @IsOptional()
  @IsInt()
  @Min(Number.MIN_SAFE_INTEGER)
  @Max(Number.MAX_SAFE_INTEGER)
  readonly seed?: number | null;

  @ApiProperty({ minimum: 0, example: 10 })
  @IsInt()
  @Min(0)
  @Max(MAX_INT)
  readonly moveCount!: number;

  @ApiProperty({ minimum: 0, example: 60000 })
  @IsInt()
  @Min(0)
  @Max(MAX_INT)
  readonly durationMs!: number;

  @ApiProperty({ example: '2026-11-23T12:00:00Z' })
  @IsISO8601({ strict: true })
  readonly finishedAt!: string;
}

/** Response of `POST /scores`, the same on a retry. */
export class SubmitScoreResponse {
  @ApiProperty({ example: true })
  readonly accepted!: boolean;

  @ApiProperty({ example: true })
  readonly personalBest!: boolean;

  @ApiProperty({ example: 17 })
  readonly rank!: number;
}

/** The request body as the use case expects it (absent values are `null`). */
export function toScoreClaimProps(body: SubmitScoreRequest): ScoreClaimProps {
  return {
    gameId: body.gameId,
    levelId: body.levelId ?? null,
    score: body.score,
    seed: body.seed ?? null,
    moveCount: body.moveCount,
    durationMs: body.durationMs,
    finishedAt: new Date(body.finishedAt),
  };
}

export function toSubmitScoreResponse(
  outcome: ScoreOutcome,
): SubmitScoreResponse {
  return { accepted: true, ...outcome };
}
