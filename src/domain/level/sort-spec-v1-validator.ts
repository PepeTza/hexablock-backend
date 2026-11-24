import type { GameId } from '../game/game-id';
import { asList, exactKeys, isIntegerIn, isRecord } from './json-shape';
import type {
  ILevelSpecValidator,
  LevelSpecViolation,
} from './level-spec-validator';

/**
 * Limits of the `hexa-sort` spec v1, exactly as api-contracts §6 lists them.
 * They live here once; a new limit is a new schema version.
 */
export const SORT_SPEC_V1 = {
  radius: 2,
  minColors: 2,
  minColorsPerStack: 1,
  maxColors: 8,
  minChips: 1,
  maxChips: 9,
  traySize: 1,
  minHeight: 1,
  maxHeight: 9,
  minGoals: 1,
  maxGoals: 99,
} as const;

const SPEC_KEYS = [
  'radius',
  'blocked',
  'initialStacks',
  'colors',
  'tray',
  'goals',
] as const;
const TRAY_KEYS = [
  'size',
  'minHeight',
  'maxHeight',
  'maxColorsPerStack',
] as const;

interface Cell {
  readonly q: number;
  readonly r: number;
}

/** A valid cell and the path where it was found, for the messages. */
type PlacedCell = readonly [path: string, cell: Cell];

/**
 * Strategy: the format checks of a `hexa-sort` level, schema version 1
 * (api-contracts §6): types, ranges and unknown fields, plus rules 1-4
 * (cells on the board, no repeated cell, chips below `colors`, a free
 * cell left). Whether the level can be won is checked by the panel and the
 * game (D-16), not here.
 */
export class SortSpecV1Validator implements ILevelSpecValidator {
  readonly gameId: GameId = 'hexa-sort';
  readonly schemaVersion = 1;

  validate(spec: unknown): readonly LevelSpecViolation[] {
    if (!isRecord(spec)) {
      return [{ field: 'spec', issue: 'must be an object' }];
    }
    const out = exactKeys(spec, SPEC_KEYS, 'spec');
    const colors = checkColors(spec.colors, out);
    checkRadius(spec.radius, out);
    checkTray(spec.tray, colors, out);
    checkGoals(spec.goals, out);
    const blocked = checkBlocked(spec.blocked, out);
    const stacks = checkStacks(spec.initialStacks, colors, out);
    checkCells([...blocked, ...stacks], out);
    return out;
  }
}

function checkRadius(value: unknown, out: LevelSpecViolation[]): void {
  if (value !== SORT_SPEC_V1.radius) {
    out.push({
      field: 'spec.radius',
      issue: `must be ${SORT_SPEC_V1.radius} in schema version 1`,
    });
  }
}

/** The number of colours, or `null` when it is not valid. */
function checkColors(value: unknown, out: LevelSpecViolation[]): number | null {
  const { minColors, maxColors } = SORT_SPEC_V1;
  if (!isIntegerIn(value, minColors, maxColors)) {
    out.push({
      field: 'spec.colors',
      issue: `must be an integer from ${minColors} to ${maxColors}`,
    });
    return null;
  }
  return value;
}

function checkTray(
  value: unknown,
  colors: number | null,
  out: LevelSpecViolation[],
): void {
  if (!isRecord(value)) {
    out.push({ field: 'spec.tray', issue: 'must be an object' });
    return;
  }
  out.push(...exactKeys(value, TRAY_KEYS, 'spec.tray'));
  const { traySize, minHeight, maxHeight } = SORT_SPEC_V1;
  if (value.size !== traySize) {
    out.push({
      field: 'spec.tray.size',
      issue: `must be ${traySize} in schema version 1`,
    });
  }
  const heightIssue = `must be an integer from ${minHeight} to ${maxHeight}`;
  const low = value.minHeight;
  const high = value.maxHeight;
  const lowValid = isIntegerIn(low, minHeight, maxHeight);
  const highValid = isIntegerIn(high, minHeight, maxHeight);
  if (!lowValid) {
    out.push({ field: 'spec.tray.minHeight', issue: heightIssue });
  }
  if (!highValid) {
    out.push({ field: 'spec.tray.maxHeight', issue: heightIssue });
  }
  if (lowValid && highValid && Number(low) > Number(high)) {
    out.push({
      field: 'spec.tray.maxHeight',
      issue: 'must be greater than or equal to minHeight',
    });
  }
  // An upper bound, so it may exceed maxHeight (api-contracts §6).
  const { minColorsPerStack } = SORT_SPEC_V1;
  if (
    colors !== null &&
    !isIntegerIn(value.maxColorsPerStack, minColorsPerStack, colors)
  ) {
    out.push({
      field: 'spec.tray.maxColorsPerStack',
      issue: `must be an integer from ${minColorsPerStack} to colors (${colors})`,
    });
  }
}

function checkGoals(value: unknown, out: LevelSpecViolation[]): void {
  const { minGoals, maxGoals } = SORT_SPEC_V1;
  if (!isIntegerIn(value, minGoals, maxGoals)) {
    out.push({
      field: 'spec.goals',
      issue: `must be an integer from ${minGoals} to ${maxGoals}`,
    });
  }
}

/** The valid cells of `blocked`. */
function checkBlocked(value: unknown, out: LevelSpecViolation[]): PlacedCell[] {
  const list = asList(value);
  if (list === null) {
    out.push({ field: 'spec.blocked', issue: 'must be an array' });
    return [];
  }
  const cells: PlacedCell[] = [];
  list.forEach((item, index) => {
    const path = `spec.blocked[${index}]`;
    const cell = checkCell(item, path, out);
    if (cell !== null) {
      cells.push([path, cell]);
    }
  });
  return cells;
}

/** The valid cells of `initialStacks`. */
function checkStacks(
  value: unknown,
  colors: number | null,
  out: LevelSpecViolation[],
): PlacedCell[] {
  const list = asList(value);
  if (list === null) {
    out.push({ field: 'spec.initialStacks', issue: 'must be an array' });
    return [];
  }
  const cells: PlacedCell[] = [];
  list.forEach((item, index) => {
    const path = `spec.initialStacks[${index}]`;
    if (!isRecord(item)) {
      out.push({ field: path, issue: 'must be an object' });
      return;
    }
    out.push(...exactKeys(item, ['cell', 'chips'], path));
    checkChips(item.chips, colors, `${path}.chips`, out);
    const cell = checkCell(item.cell, `${path}.cell`, out);
    if (cell !== null) {
      cells.push([`${path}.cell`, cell]);
    }
  });
  return cells;
}

/** Rule 3: 1 to 9 chips, each a colour index from 0 to `colors - 1`. */
function checkChips(
  value: unknown,
  colors: number | null,
  path: string,
  out: LevelSpecViolation[],
): void {
  const { minChips, maxChips } = SORT_SPEC_V1;
  const chips = asList(value);
  if (chips === null || chips.length < minChips || chips.length > maxChips) {
    out.push({
      field: path,
      issue: `must be an array of ${minChips} to ${maxChips} chips`,
    });
    return;
  }
  if (colors === null) {
    return; // Needs a valid `colors`, already reported.
  }
  chips.forEach((chip, index) => {
    if (!isIntegerIn(chip, 0, colors - 1)) {
      out.push({
        field: `${path}[${index}]`,
        issue: `must be an integer from 0 to colors - 1 (${colors - 1})`,
      });
    }
  });
}

/** The cell when it has exactly integer `q` and `r`, or `null`. */
function checkCell(
  value: unknown,
  path: string,
  out: LevelSpecViolation[],
): Cell | null {
  if (!isRecord(value)) {
    out.push({ field: path, issue: 'must be an object with q and r' });
    return null;
  }
  const keyIssues = exactKeys(value, ['q', 'r'], path);
  out.push(...keyIssues);
  const { q, r } = value;
  if (!Number.isSafeInteger(q) || !Number.isSafeInteger(r)) {
    out.push({ field: path, issue: 'q and r must be integers' });
    return null;
  }
  return keyIssues.length === 0 ? { q: Number(q), r: Number(r) } : null;
}

/** Rules 1, 2 and 4: on the board, never repeated, a free cell left. */
function checkCells(
  cells: readonly PlacedCell[],
  out: LevelSpecViolation[],
): void {
  const { radius } = SORT_SPEC_V1;
  const used = new Set<string>();
  for (const [path, { q, r }] of cells) {
    // Axial distance to (0, 0); source in api-contracts §6 (Red Blob Games).
    if (Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r)) > radius) {
      out.push({ field: path, issue: 'is outside the board' });
      continue;
    }
    const key = `${q},${r}`;
    if (used.has(key)) {
      out.push({ field: path, issue: 'repeats a cell already used' });
      continue;
    }
    used.add(key);
  }
  // A hexagon of radius n has 1 + 3·n·(n + 1) cells (19 for radius 2).
  const boardCells = 1 + 3 * radius * (radius + 1);
  if (used.size >= boardCells) {
    out.push({ field: 'spec', issue: 'leaves no free cell to place a stack' });
  }
}
