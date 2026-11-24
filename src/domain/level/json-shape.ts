import type { LevelSpecViolation } from './level-spec-validator';

/** Helpers to read untyped JSON safely, by narrowing instead of casting. */

/** A plain JSON object (not `null`, not an array). */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** The value as a list, or `null` when it is not an array. */
export function asList(value: unknown): readonly unknown[] | null {
  if (!Array.isArray(value)) {
    return null;
  }
  const list: readonly unknown[] = value;
  return list;
}

/** An integer from `min` to `max`, both included. */
export function isIntegerIn(
  value: unknown,
  min: number,
  max: number,
): value is number {
  return (
    Number.isSafeInteger(value) && Number(value) >= min && Number(value) <= max
  );
}

/**
 * One violation for each missing key of `required` and each key of `value`
 * not in it: the object must have exactly these fields.
 */
export function exactKeys(
  value: Record<string, unknown>,
  required: readonly string[],
  path: string,
): LevelSpecViolation[] {
  const present = Object.keys(value);
  const missing = required
    .filter((key) => !present.includes(key))
    .map((key) => ({ field: `${path}.${key}`, issue: 'is required' }));
  const unknown = Object.keys(value)
    .filter((key) => !required.includes(key))
    .map((key) => ({ field: `${path}.${key}`, issue: 'is not allowed' }));
  return [...missing, ...unknown];
}
