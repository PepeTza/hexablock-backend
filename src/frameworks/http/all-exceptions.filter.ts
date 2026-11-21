import { ArgumentsHost, Catch, ExceptionFilter, Logger } from '@nestjs/common';
import type { Response } from 'express';

import { toErrorResponse } from '../../adapters/http/errors/error-response';
import { requestIdOf, RequestWithId } from './request-id';

/**
 * Aspect: centralised error handling. Catches every error of every route,
 * answers with the contract's error body and keeps the full detail of
 * unexpected errors in the server log only (decision 22). Controllers and
 * use cases need no try/catch for this.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('HTTP');

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<RequestWithId>();
    const response = http.getResponse<Response>();

    const body = toErrorResponse(exception, requestIdOf(request));

    if (body.statusCode >= 500) {
      this.logger.error(
        `[${body.requestId}] Unexpected error: ${describe(exception)}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }
    response.status(body.statusCode).json(body);
  }
}

function describe(exception: unknown): string {
  return exception instanceof Error ? exception.message : String(exception);
}
