import {
  CallHandler,
  ExecutionContext,
  Logger,
  LoggerService,
  NestInterceptor,
} from '@nestjs/common';
import type { Response } from 'express';
import { Observable, tap } from 'rxjs';

import { statusOf } from '../../adapters/http/errors/error-response';
import { requestIdOf, RequestWithId } from './request-id';

/**
 * Aspect: request logging. Writes one line per handled request with its
 * request id, method, path, status and duration, so no controller logs by
 * hand. It never logs bodies, headers or the query string, which may carry
 * passwords or tokens (decision 22). Requests to unknown routes never reach
 * an interceptor; the exception filter answers those.
 */
export class RequestLoggingInterceptor implements NestInterceptor {
  constructor(
    private readonly logger: LoggerService = new Logger('HTTP'),
    private readonly now: () => number = Date.now,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<RequestWithId>();
    const response = http.getResponse<Response>();
    const startedAt = this.now();

    const logLine = (status: number): void => {
      const path = request.originalUrl.split('?')[0];
      const duration = this.now() - startedAt;
      this.logger.log(
        `[${requestIdOf(request)}] ${request.method} ${path} ${status} ${duration}ms`,
      );
    };

    return next.handle().pipe(
      tap({
        next: () => logLine(response.statusCode),
        error: (error: unknown) => logLine(statusOf(error)),
      }),
    );
  }
}
