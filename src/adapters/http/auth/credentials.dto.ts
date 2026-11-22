import { ApiProperty } from '@nestjs/swagger';
import {
  IsByteLength,
  IsNotEmpty,
  IsString,
  Length,
  Matches,
  MinLength,
} from 'class-validator';

const MIN_PASSWORD_LENGTH = 8;
// bcrypt reads only the first 72 bytes of a password (decision 21). Every
// character takes at least one byte, so this also caps it at 72 characters.
const MAX_PASSWORD_BYTES = 72;

/**
 * Body of `POST /auth/register` (api-contracts §3). Checks the format rules
 * of decision 21 so a bad field gets the contract's `400` with `details`.
 * The `Username` value object checks the name again inside the domain.
 */
export class RegisterRequest {
  @ApiProperty({
    example: 'ronald_g',
    minLength: 3,
    maxLength: 20,
    pattern: '^[A-Za-z0-9_]+$',
  })
  @IsString()
  @Length(3, 20, { message: 'username must be between 3 and 20 characters' })
  @Matches(/^[A-Za-z0-9_]+$/, {
    message: 'username may only contain ASCII letters, digits and underscore',
  })
  readonly username!: string;

  @ApiProperty({
    example: 's3cretPass',
    minLength: MIN_PASSWORD_LENGTH,
    description: `At least ${MIN_PASSWORD_LENGTH} characters and at most ${MAX_PASSWORD_BYTES} bytes in UTF-8`,
  })
  @IsString()
  @MinLength(MIN_PASSWORD_LENGTH, {
    message: `password must have at least ${MIN_PASSWORD_LENGTH} characters`,
  })
  @IsByteLength(0, MAX_PASSWORD_BYTES, {
    message: `password must be at most ${MAX_PASSWORD_BYTES} bytes in UTF-8`,
  })
  readonly password!: string;
}

/**
 * Body of `POST /auth/login`. Only checks that both fields are text: a name
 * or password that breaks the format simply fails as wrong credentials, with
 * the generic `401` (CU-11 A1), instead of a `400` explaining the rules.
 */
export class LoginRequest {
  @ApiProperty({ example: 'ronald_g' })
  @IsString()
  @IsNotEmpty()
  readonly username!: string;

  @ApiProperty({ example: 's3cretPass' })
  @IsString()
  @IsNotEmpty()
  readonly password!: string;
}
