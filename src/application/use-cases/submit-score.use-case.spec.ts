import type {
  ScoreClaim,
  ScoreClaimProps,
} from '../../domain/score/score-claim';
import { ApplicationError } from '../errors/application-error';
import { UNKNOWN_LEVEL_MESSAGE } from '../errors/progress-messages';
import {
  IMPLAUSIBLE_SCORE_MESSAGE,
  SESSION_TAKEN_MESSAGE,
} from '../errors/score-messages';
import type { ILevelRepository } from '../ports/level-repository';
import type {
  IScoreRepository,
  ScoreOutcome,
  StoredSubmission,
} from '../ports/score-repository';
import { SubmitScoreUseCase } from './submit-score.use-case';

const ANA = 'user-ana';
const BETO = 'user-beto';
const SESSION = 'e3d1c2b4-0000-4000-8000-000000000001';
const SORT_LEVEL = '0b000000-0000-4000-8000-00000000000b';
const OUTCOME: ScoreOutcome = { personalBest: true, rank: 3 };

/** Fake log: stores submissions by `sessionId`, always ranks 3rd. */
class InMemoryScoreRepository implements IScoreRepository {
  readonly stored = new Map<string, StoredSubmission>();
  readonly rejected: string[] = [];
  /** When set, `recordAccepted` loses a race against this submission. */
  raceWinner: StoredSubmission | null = null;

  findBySession(sessionId: string): Promise<StoredSubmission | null> {
    return Promise.resolve(this.stored.get(sessionId) ?? null);
  }

  recordRejected(
    userId: string,
    sessionId: string,
    _claim: ScoreClaim,
    reason: string,
  ): Promise<void> {
    this.stored.set(sessionId, { userId, status: 'rejected' });
    this.rejected.push(reason);
    return Promise.resolve();
  }

  recordAccepted(
    userId: string,
    sessionId: string,
  ): Promise<ScoreOutcome | null> {
    if (this.raceWinner) {
      this.stored.set(sessionId, this.raceWinner);
      return Promise.resolve(null);
    }
    this.stored.set(sessionId, {
      userId,
      status: 'accepted',
      outcome: OUTCOME,
    });
    return Promise.resolve(OUTCOME);
  }
}

/** Fake catalogue with one published Hexa Sort level. */
const levels: ILevelRepository = {
  existingIds: (gameId, ids) =>
    Promise.resolve(
      new Set(ids.filter((id) => gameId === 'hexa-sort' && id === SORT_LEVEL)),
    ),
};

function lines(overrides: Partial<ScoreClaimProps> = {}): ScoreClaimProps {
  return {
    gameId: 'hexa-lines',
    levelId: null,
    score: 120,
    seed: 1739201,
    moveCount: 10,
    durationMs: 60_000,
    finishedAt: new Date('2026-11-23T12:00:00Z'),
    ...overrides,
  };
}

function setUp(): {
  useCase: SubmitScoreUseCase;
  repository: InMemoryScoreRepository;
} {
  const repository = new InMemoryScoreRepository();
  return { useCase: new SubmitScoreUseCase(repository, levels), repository };
}

describe('SubmitScoreUseCase', () => {
  it('should_record_and_return_the_rank_when_the_score_is_plausible', async () => {
    // Arrange
    const { useCase, repository } = setUp();

    // Act
    const result = await useCase.execute({
      userId: ANA,
      sessionId: SESSION,
      claim: lines(),
    });

    // Assert
    expect(result).toEqual({ outcome: OUTCOME, replayed: false });
    expect(repository.stored.get(SESSION)?.status).toBe('accepted');
  });

  it('should_record_as_rejected_and_throw_422_when_implausible', async () => {
    // Arrange: far above the Hexa Lines bound for one move.
    const { useCase, repository } = setUp();
    const claim = lines({ score: 99_999_999, moveCount: 1 });

    // Act
    const act = useCase.execute({ userId: ANA, sessionId: SESSION, claim });

    // Assert
    await expect(act).rejects.toEqual(
      new ApplicationError('unprocessable', IMPLAUSIBLE_SCORE_MESSAGE),
    );
    expect(repository.stored.get(SESSION)?.status).toBe('rejected');
    expect(repository.rejected).toEqual(['score above 2255 for 1 moves']);
  });

  it('should_return_replayed_when_the_session_was_already_accepted', async () => {
    // Arrange
    const { useCase } = setUp();
    const input = { userId: ANA, sessionId: SESSION, claim: lines() };
    await useCase.execute(input);

    // Act
    const retry = await useCase.execute(input);

    // Assert
    expect(retry).toEqual({ outcome: OUTCOME, replayed: true });
  });

  it('should_throw_422_again_when_a_rejected_session_is_resent', async () => {
    // Arrange
    const { useCase } = setUp();
    const input = {
      userId: ANA,
      sessionId: SESSION,
      claim: lines({ score: 99_999_999, moveCount: 1 }),
    };
    await useCase.execute(input).catch(() => undefined);

    // Act
    const retry = useCase.execute(input);

    // Assert
    await expect(retry).rejects.toEqual(
      new ApplicationError('unprocessable', IMPLAUSIBLE_SCORE_MESSAGE),
    );
  });

  it('should_throw_400_when_the_session_belongs_to_another_player', async () => {
    // Arrange
    const { useCase } = setUp();
    await useCase.execute({ userId: ANA, sessionId: SESSION, claim: lines() });

    // Act
    const act = useCase.execute({
      userId: BETO,
      sessionId: SESSION,
      claim: lines(),
    });

    // Assert
    await expect(act).rejects.toEqual(
      new ApplicationError('invalid', SESSION_TAKEN_MESSAGE),
    );
  });

  it('should_throw_400_when_the_level_is_unknown', async () => {
    // Arrange: a Hexa Sort level sent as a Hexa Fit one.
    const { useCase, repository } = setUp();
    const claim = lines({
      gameId: 'hexa-fit',
      levelId: SORT_LEVEL,
      seed: null,
      score: 500,
    });

    // Act
    const act = useCase.execute({ userId: ANA, sessionId: SESSION, claim });

    // Assert
    await expect(act).rejects.toEqual(
      new ApplicationError('invalid', UNKNOWN_LEVEL_MESSAGE),
    );
    expect(repository.stored.size).toBe(0);
  });

  it('should_throw_400_when_the_claim_breaks_a_format_rule', async () => {
    // Arrange
    const { useCase } = setUp();

    // Act
    const act = useCase.execute({
      userId: ANA,
      sessionId: SESSION,
      claim: lines({ levelId: SORT_LEVEL }),
    });

    // Assert
    await expect(act).rejects.toEqual(
      new ApplicationError('invalid', 'levelId must be null in hexa-lines'),
    );
  });

  it('should_answer_like_a_retry_when_a_concurrent_request_stored_the_session_first', async () => {
    // Arrange
    const { useCase, repository } = setUp();
    const winnerOutcome = { personalBest: false, rank: 9 };
    repository.raceWinner = {
      userId: ANA,
      status: 'accepted',
      outcome: winnerOutcome,
    };

    // Act
    const result = await useCase.execute({
      userId: ANA,
      sessionId: SESSION,
      claim: lines(),
    });

    // Assert
    expect(result).toEqual({ outcome: winnerOutcome, replayed: true });
  });
});
