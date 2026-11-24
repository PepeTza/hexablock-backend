/** How a game or a Hexa Sort level picks its seed (RN-05). */
export const SEED_MODES = ['fixed', 'random'] as const;
export type SeedMode = (typeof SEED_MODES)[number];

/**
 * Largest seed: the client's seeded random works on unsigned 32-bit
 * integers, so a larger value would silently play another seed
 * (api-contracts §7).
 */
export const MAX_SEED_VALUE = 0xffff_ffff;

/** A seed config: a fixed value, or a new random seed each game. */
export type SeedConfig =
  | { readonly mode: 'fixed'; readonly value: number }
  | { readonly mode: 'random' };

/**
 * Why a seed config is invalid, or `null` when it is valid: `fixed` needs
 * an integer from 0 to MAX_SEED_VALUE, and `random` takes no value.
 */
export function seedConfigIssue(mode: unknown, value: unknown): string | null {
  if (mode === 'random') {
    return value === undefined
      ? null
      : 'value must be absent when mode is random';
  }
  if (mode === 'fixed') {
    const inRange =
      Number.isSafeInteger(value) &&
      Number(value) >= 0 &&
      Number(value) <= MAX_SEED_VALUE;
    return inRange
      ? null
      : `value must be an integer from 0 to ${MAX_SEED_VALUE} when mode is fixed`;
  }
  return `mode must be one of ${SEED_MODES.join(', ')}`;
}
