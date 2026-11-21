import {
  CallHandler,
  ConflictException,
  ExecutionContext,
  LoggerService,
} from '@nestjs/common';
import { lastValueFrom, of, throwError } from 'rxjs';

import { RequestLoggingInterceptor } from './request-logging.interceptor';

const REQUEST_ID = '6f1c2a9e-0000-4000-8000-000000000001';

/** A logger whose `log` calls can be inspected. */
function fakeLogger(): { logger: LoggerService; log: jest.Mock } {
  const log = jest.fn();
  return { logger: { log, error: jest.fn(), warn: jest.fn() }, log };
}

/** A clock that answers each call with the next of the given times (ms). */
function fakeClock(...times: number[]): () => number {
  let call = 0;
  return () => times[call++] ?? 0;
}

function httpContext(statusCode = 200): ExecutionContext {
  const request = {
    method: 'POST',
    originalUrl: '/api/v1/auth/login?remember=true',
    requestId: REQUEST_ID,
    headers: { authorization: 'Bearer secret-token' },
    body: { username: 'kenneth', password: 'super-secret' },
  };
  const response = { statusCode };
  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as unknown as ExecutionContext;
}

function handlerReturning(value: unknown): CallHandler {
  return { handle: () => of(value) };
}

function handlerFailingWith(error: Error): CallHandler {
  return { handle: () => throwError(() => error) };
}

describe('RequestLoggingInterceptor', () => {
  it('should_log_one_line_with_method_path_status_duration_and_request_id', async () => {
    // Arrange
    const { logger, log } = fakeLogger();
    const interceptor = new RequestLoggingInterceptor(
      logger,
      fakeClock(100, 142),
    );

    // Act
    await lastValueFrom(
      interceptor.intercept(httpContext(201), handlerReturning({ ok: true })),
    );

    // Assert
    expect(log).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith(
      `[${REQUEST_ID}] POST /api/v1/auth/login 201 42ms`,
    );
  });

  it('should_log_the_error_status_when_the_handler_fails', async () => {
    // Arrange
    const { logger, log } = fakeLogger();
    const interceptor = new RequestLoggingInterceptor(logger, fakeClock(0, 7));
    const error = new ConflictException('Username already taken');

    // Act
    const result = lastValueFrom(
      interceptor.intercept(httpContext(), handlerFailingWith(error)),
    );

    // Assert
    await expect(result).rejects.toBe(error);
    expect(log).toHaveBeenCalledWith(
      `[${REQUEST_ID}] POST /api/v1/auth/login 409 7ms`,
    );
  });

  it('should_never_log_the_body_or_the_authorization_header', async () => {
    // Arrange
    const { logger, log } = fakeLogger();
    const interceptor = new RequestLoggingInterceptor(logger, fakeClock(0, 1));

    // Act
    await lastValueFrom(
      interceptor.intercept(httpContext(), handlerReturning({ ok: true })),
    );

    // Assert
    const logged = JSON.stringify(log.mock.calls);
    expect(logged).not.toMatch(/super-secret|secret-token|remember/);
  });
});
