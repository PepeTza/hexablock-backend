import type { ScoreClaim } from '../../domain/score/score-claim';

/** Where an accepted score left the player (api-contracts §5). */
export interface ScoreOutcome {
  /** `true` when this score is the player's leaderboard entry. */
  readonly personalBest: boolean;
  /** The player's position in that table, starting at 1. */
  readonly rank: number;
}

/** A submission already stored under a `sessionId`. */
export type StoredSubmission =
  | { readonly userId: string; readonly status: 'rejected' }
  | {
      readonly userId: string;
      readonly status: 'accepted';
      readonly outcome: ScoreOutcome;
    };

/**
 * Port: the log of score submissions and the leaderboard entries they feed
 * (RN-39, RN-43). Every submission is stored, accepted or not.
 */
export interface IScoreRepository {
  /** The submission stored under `sessionId`, or `null` if it is new. */
  findBySession(sessionId: string): Promise<StoredSubmission | null>;

  /** Logs an implausible submission; it never reaches the leaderboard. */
  recordRejected(
    userId: string,
    sessionId: string,
    claim: ScoreClaim,
    reason: string,
  ): Promise<void>;

  /**
   * Stores an accepted submission and, in the same transaction, updates the
   * player's entry only when the score beats it. Returns `null` when the
   * `sessionId` was stored meanwhile by a concurrent request.
   */
  recordAccepted(
    userId: string,
    sessionId: string,
    claim: ScoreClaim,
  ): Promise<ScoreOutcome | null>;
}
