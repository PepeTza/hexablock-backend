/**
 * What went wrong, in the terms of the application. Use cases never know
 * about HTTP: the HTTP adapter decides which status each kind becomes.
 * `invalid` is input that breaks a rule the contract answers with `400`
 * (an unknown `levelId`, for example); `unprocessable` is well-formed input
 * a business rule rejects with `422` (an implausible score).
 */
export type ApplicationErrorKind =
  | 'invalid'
  | 'conflict'
  | 'not_found'
  | 'unauthorized'
  | 'forbidden'
  | 'unprocessable';

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
