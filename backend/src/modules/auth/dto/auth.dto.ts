import { Transform } from 'class-transformer';
import { IsEmail, IsString, Length, MaxLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class RegisterDto {
  @Transform(trim) @IsEmail() @MaxLength(254)
  email: string;

  @IsString() @Length(8, 128)
  password: string;

  @Transform(trim) @IsString() @Length(2, 32)
  displayName: string;
}

export class LoginDto {
  @Transform(trim) @IsEmail()
  email: string;

  @IsString()
  password: string;
}
