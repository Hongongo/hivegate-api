import { IsString, MinLength } from 'class-validator';

export class ValidateQrDto {
  @IsString()
  @MinLength(10)
  token!: string;
}