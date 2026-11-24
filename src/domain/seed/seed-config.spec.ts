import { MAX_SEED_VALUE, seedConfigIssue } from './seed-config';

describe('seedConfigIssue', () => {
  it.each([0, 42, MAX_SEED_VALUE])(
    'should_accept_a_fixed_seed_when_the_value_is_%s',
    (value) => {
      // Act / Assert
      expect(seedConfigIssue('fixed', value)).toBeNull();
    },
  );

  it('should_accept_a_random_seed_when_it_has_no_value', () => {
    // Act / Assert
    expect(seedConfigIssue('random', undefined)).toBeNull();
  });

  it.each([
    ['missing', undefined],
    ['negative', -1],
    ['above 32 bits', MAX_SEED_VALUE + 1],
    ['a decimal', 1.5],
  ])('should_reject_a_fixed_seed_when_the_value_is_%s', (_case, value) => {
    // Act / Assert
    expect(seedConfigIssue('fixed', value)).toBe(
      'value must be an integer from 0 to 4294967295 when mode is fixed',
    );
  });

  it('should_reject_a_random_seed_when_it_has_a_value', () => {
    // Act / Assert
    expect(seedConfigIssue('random', 7)).toBe(
      'value must be absent when mode is random',
    );
  });

  it('should_reject_the_config_when_the_mode_is_unknown', () => {
    // Act / Assert
    expect(seedConfigIssue('daily', undefined)).toBe(
      'mode must be one of fixed, random',
    );
  });
});
