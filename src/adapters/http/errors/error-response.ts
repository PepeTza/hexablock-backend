import { STATUS_CODES } from 'node:http';

import { HttpException, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import {
  ApplicationError,
  ApplicationErrorKind,
} from '../../../application/errors/application-error';

/** One invalid field of a request (api-contracts §1, error format). */
export interface ErrorDetail {
  readonly field: string;
  readonly issue: string;
}

/**
 * Body of every error response (api-contracts §1). `requestId` lets a
 * reported error be found in the server log without showing its detail.
 */
export interface ErrorResponse {
  readonly statusCode: number;
  readonly error: string;
  readonly message: string;
  readonly details?: readonly ErrorDetail[];
  readonly requestId: string;
}

/** The only message a client ever sees for an unexpected error (D-22). */
export const UNEXPECTED_ERROR_MESSAGE = 'Unexpected error';

const KIND_STATUS: Record<ApplicationErrorKind, HttpStatus> = {
  conflict: HttpStatus.CONFLICT,
  not_found: HttpStatus.NOT_FOUND,
  unauthorized: HttpStatus.UNAUTHORIZED,
  forbidden: HttpStatus.FORBIDDEN,
  unprocessable: HttpStatus.UNPROCESSABLE_ENTITY,
};

/**
 * Known Prisma errors, mapped on purpose with the contract's messages, never
 * Prisma's own text (which names tables and columns). A safety net: each
 * repository should translate its errors into `ApplicationError` first.
 */
const PRISMA_ERRORS: Record<string, { status: HttpStatus; message: string }> = {
  P2002: { status: HttpStatus.CONFLICT, message: 'Resource already exists' },
  P2025: { status: HttpStatus.NOT_FOUND, message: 'Resource not found' },
};

/** HTTP status for any error; everything not mapped on purpose is a 500. */
export function statusOf(exception: unknown): number {
  if (exception instanceof HttpException) {
    return exception.getStatus();
  }
  if (exception instanceof ApplicationError) {
    return KIND_STATUS[exception.kind];
  }
  if (exception instanceof Prisma.PrismaClientKnownRequestError) {
    return (
      PRISMA_ERRORS[exception.code]?.status ?? HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
  return HttpStatus.INTERNAL_SERVER_ERROR;
}

/**
 * Turns any error into the contract's error body. Only errors raised on
 * purpose keep their message; a 5xx always gets the generic one, so no stack,
 * SQL or Prisma detail ever reaches the client (decision 22).
 */
export function toErrorResponse(
  exception: unknown,
  requestId: string,
): ErrorResponse {
  const statusCode = statusOf(exception);
  const error = STATUS_CODES[statusCode] ?? 'Error';

  if (statusCode >= 500) {
    return { statusCode, error, message: UNEXPECTED_ERROR_MESSAGE, requestId };
  }
  if (exception instanceof HttpException) {
    return { statusCode, error, ...httpExceptionContent(exception), requestId };
  }
  if (exception instanceof ApplicationError) {
    return { statusCode, error, message: exception.message, requestId };
  }
  if (exception instanceof Prisma.PrismaClientKnownRequestError) {
    const message = PRISMA_ERRORS[exception.code]?.message ?? error;
    return { statusCode, error, message, requestId };
  }
  return { statusCode, error, message: error, requestId };
}

/** Message and optional details of an `HttpException` thrown on purpose. */
function httpExceptionContent(exception: HttpException): {
  message: string;
  details?: readonly ErrorDetail[];
} {
  const response = exception.getResponse();
  if (typeof response === 'string') {
    return { message: response };
  }
  const { message, details } = response as {
    message?: unknown;
    details?: readonly ErrorDetail[];
  };
  return {
    message: typeof message === 'string' ? message : exception.message,
    ...(details ? { details } : {}),
  };
}
