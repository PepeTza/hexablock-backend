/**
 * What went wrong, in the terms of the application. Use cases never know
 * about HTTP: the HTTP adapter decides which status each kind becomes.
 */
export type ApplicationErrorKind =
  'conflict' | 'not_found' | 'unauthorized' | 'forbidden' | 'unprocessable';

/**
 * Error a use case throws on purpose. Its message is safe to show to the
 * client (it follows the contract), unlike any unexpected error.
 */
export class ApplicationError extends Error {
  constructor(
    readonly kind: ApplicationErrorKind,
    message: string,
  ) {
    super(message);
    this.name = 'ApplicationError';
  }
}
