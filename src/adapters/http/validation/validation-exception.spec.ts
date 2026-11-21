import { ValidationError } from 'class-validator';

import {
  INVALID_BODY_MESSAGE,
  issueOf,
  toValidationException,
} from './validation-exception';

function fieldError(
  property: string,
  constraints: Record<string, string>,
  children: ValidationError[] = [],
): ValidationError {
  return Object.assign(new ValidationError(), {
    property,
    constraints,
    children,
  });
}

describe('toValidationException', () => {
  it('should_answer_400_with_the_first_message_and_one_detail_per_problem', () => {
    // Arrange
    const errors = [
      fieldError('username', {
        isLength: 'username must be between 3 and 20 characters',
      }),
      fieldError('password', { isString: 'password must be a string' }),
    ];

    // Act
    const exception = toValidationException(errors);

    // Assert
    expect(exception.getStatus()).toBe(400);
    expect(exception.getResponse()).toEqual({
      message: 'username must be between 3 and 20 characters',
      details: [
        { field: 'username', issue: 'length' },
        { field: 'password', issue: 'string' },
      ],
    });
  });

  it('should_name_nested_fields_with_their_full_path', () => {
    // Arrange
    const errors = [
      fieldError('moves', {}, [
        fieldError('0', {}, [
          fieldError('x', { isInt: 'x must be an integer' }),
        ]),
      ]),
    ];

    // Act
    const exception = toValidationException(errors);

    // Assert
    expect(exception.getResponse()).toMatchObject({
      details: [{ field: 'moves.0.x', issue: 'int' }],
    });
  });

  it('should_use_a_generic_message_when_no_constraint_has_one', () => {
    // Act
    const exception = toValidationException([]);

    // Assert
    expect(exception.getResponse()).toEqual({
      message: INVALID_BODY_MESSAGE,
      details: [],
    });
  });
});

describe('issueOf', () => {
  it.each([
    ['isLength', 'length'],
    ['isNotEmpty', 'notEmpty'],
    ['min', 'min'],
    ['island', 'island'],
    ['whitelistValidation', 'notAllowed'],
  ])('should_turn_%s_into_%s', (constraint, issue) => {
    // Act / Assert
    expect(issueOf(constraint)).toBe(issue);
  });
});
