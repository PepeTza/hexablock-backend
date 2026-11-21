import { BadRequestException } from '@nestjs/common';
import type { ValidationError } from 'class-validator';

import type { ErrorDetail } from '../errors/error-response';

/** Used only if class-validator ever reports an error without a message. */
export const INVALID_BODY_MESSAGE = 'Invalid request body';

// class-validator's name for a field that is not declared in the DTO.
const NOT_ALLOWED_CONSTRAINT = 'whitelistValidation';

interface FieldProblem extends ErrorDetail {
  readonly message: string;
}

/**
 * Turns class-validator's errors into the contract's 400 (api-contracts §1):
 * the first problem as `message` and one `{ field, issue }` per problem.
 */
export function toValidationException(
  errors: readonly ValidationError[],
): BadRequestException {
  const problems = errors.flatMap((error) => problemsOf(error, ''));
  return new BadRequestException({
    message: problems[0]?.message ?? INVALID_BODY_MESSAGE,
    details: problems.map(({ field, issue }) => ({ field, issue })),
  });
}

/** Problems of one field and of its nested fields (`moves.0.x`). */
function problemsOf(error: ValidationError, parent: string): FieldProblem[] {
  const field = parent ? `${parent}.${error.property}` : error.property;
  const own = Object.entries(error.constraints ?? {}).map(
    ([constraint, message]) => ({ field, issue: issueOf(constraint), message }),
  );
  const nested = (error.children ?? []).flatMap((child) =>
    problemsOf(child, field),
  );
  return [...own, ...nested];
}

/** `isLength` → `length`, `isNotEmpty` → `notEmpty`, `min` → `min`. */
export function issueOf(constraint: string): string {
  if (constraint === NOT_ALLOWED_CONSTRAINT) {
    return 'notAllowed';
  }
  const match = /^is([A-Z].*)$/.exec(constraint);
  if (!match?.[1]) {
    return constraint;
  }
  return match[1].charAt(0).toLowerCase() + match[1].slice(1);
}
