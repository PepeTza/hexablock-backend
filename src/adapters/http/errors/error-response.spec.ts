import { HttpException, HttpStatus, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { ApplicationError } from '../../../application/errors/application-error';
import { toErrorResponse, UNEXPECTED_ERROR_MESSAGE } from './error-response';

const REQUEST_ID = '6f1c2a9e-0000-4000-8000-000000000001';

describe('toErrorResponse', () => {
  it('should_answer_generic_500_without_detail_when_the_error_is_unexpected', () => {
    // Arrange
    const error = new Error('SELECT password_hash FROM users failed');

    // Act
    const body = toErrorResponse(error, REQUEST_ID);

    // Assert
    expect(body).toEqual({
      statusCode: 500,
      error: 'Internal Server Error',
      message: UNEXPECTED_ERROR_MESSAGE,
      requestId: REQUEST_ID,
    });
    expect(JSON.stringify(body)).not.toContain('password_hash');
  });

  it('should_return_400_for_an_invalid_application_error', () => {
    // Arrange
    const error = new ApplicationError(
      'invalid',
      'unknown levelId for this game',
    );

    // Act
    const body = toErrorResponse(error, REQUEST_ID);

    // Assert
    expect(body).toEqual({
      statusCode: 400,
      error: 'Bad Request',
      message: 'unknown levelId for this game',
      requestId: REQUEST_ID,
    });
  });

  it('should_map_a_conflict_application_error_to_409', () => {
    // Arrange
    const error = new ApplicationError('conflict', 'Username already taken');

    // Act
    const body = toErrorResponse(error, REQUEST_ID);

    // Assert
    expect(body).toEqual({
      statusCode: 409,
      error: 'Conflict',
      message: 'Username already taken',
      requestId: REQUEST_ID,
    });
  });

  it('should_map_a_prisma_unique_violation_to_409_with_the_contract_message', () => {
    // Arrange
    const error = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed on the fields: (`username`) of table `users`',
      { code: 'P2002', clientVersion: '7.10.1' },
    );

    // Act
    const body = toErrorResponse(error, REQUEST_ID);

    // Assert
    expect(body).toEqual({
      statusCode: 409,
      error: 'Conflict',
      message: 'Resource already exists',
      requestId: REQUEST_ID,
    });
    expect(JSON.stringify(body)).not.toContain('users');
  });

  it('should_answer_generic_500_when_the_prisma_error_is_not_mapped', () => {
    // Arrange
    const error = new Prisma.PrismaClientKnownRequestError(
      'Foreign key constraint failed on the field: `level_id`',
      { code: 'P2003', clientVersion: '7.10.1' },
    );

    // Act
    const body = toErrorResponse(error, REQUEST_ID);

    // Assert
    expect(body.statusCode).toBe(500);
    expect(body.message).toBe(UNEXPECTED_ERROR_MESSAGE);
  });

  it('should_keep_status_and_message_when_the_error_is_an_http_exception', () => {
    // Arrange
    const error = new NotFoundException('Level not found');

    // Act
    const body = toErrorResponse(error, REQUEST_ID);

    // Assert
    expect(body).toEqual({
      statusCode: 404,
      error: 'Not Found',
      message: 'Level not found',
      requestId: REQUEST_ID,
    });
  });

  it('should_keep_the_details_when_an_http_exception_carries_them', () => {
    // Arrange
    const details = [{ field: 'username', issue: 'length' }];
    const error = new HttpException(
      { message: 'Invalid request', details },
      HttpStatus.BAD_REQUEST,
    );

    // Act
    const body = toErrorResponse(error, REQUEST_ID);

    // Assert
    expect(body.details).toEqual(details);
  });

  it('should_hide_the_message_when_an_http_exception_is_a_server_error', () => {
    // Arrange
    const error = new HttpException(
      'Connection to db.internal:5432 refused',
      HttpStatus.BAD_GATEWAY,
    );

    // Act
    const body = toErrorResponse(error, REQUEST_ID);

    // Assert
    expect(body.statusCode).toBe(502);
    expect(body.message).toBe(UNEXPECTED_ERROR_MESSAGE);
  });

  it('should_include_the_request_id_in_every_error_body', () => {
    // Arrange
    const errors = [
      new Error('boom'),
      new ApplicationError('forbidden', 'Admin role required'),
      new NotFoundException(),
    ];

    // Act
    const bodies = errors.map((error) => toErrorResponse(error, REQUEST_ID));

    // Assert
    expect(bodies.every((body) => body.requestId === REQUEST_ID)).toBe(true);
  });
});
