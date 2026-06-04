import { IsOptional, IsString } from 'class-validator';

export class RegisterExitDto {
  @IsOptional()
  @IsString()
  notes?: string;
}